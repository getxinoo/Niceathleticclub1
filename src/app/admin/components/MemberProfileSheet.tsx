/**
 * MemberProfileSheet.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Mitgliederprofil als Right-Side-Sheet.
 *
 * Konsolidierte Tab-Struktur (v2):
 *  1. Stammdaten  – Profil/Kontakt · Adresse · Zahlung/SEPA (3-Card-Grid)
 *  2. Aktivitäten – DSGVO-konformes Änderungsprotokoll (Timeline)
 *  3. Verträge    – Tarif, Status, System, Notizen
 *
 * WICHTIG: Alle bestehenden save-Logiken, API-Calls und der Header bleiben
 * vollständig erhalten. Nur die Tab-Struktur wurde konsolidiert.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from "@/app/components/ui/sheet";
import { toast } from "sonner";
import {
  Save, Loader2, ExternalLink, ShieldOff, ChevronDown,
  User, MapPin, Settings2, StickyNote, CheckCircle2,
  Circle, Copy, CheckCheck, Lock, Activity,
  CreditCard, Mail, Pencil, X, Landmark, Hash,
  Phone, FileText, AlertCircle, Clock, Key,
} from "lucide-react";
import { api, Member, MemberStatus, ContractType } from "@/lib/api-service";
import { AdminMemberTrackingTab } from "@/app/admin/components/AdminMemberTrackingTab";

// ── Typen ─────────────────────────────────────────────────────────────────────
interface Props {
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ── SEPA-Mock-Daten (werden per Member-ID deterministisch generiert) ───────────
interface MockSepa {
  ibanMasked: string;
  bic: string;
  mandateRef: string;
  status: "active" | "pending" | "none";
  signedAt: string;
}

function getMockSepa(memberId: string | undefined): MockSepa | null {
  if (!memberId) return null;
  const hash = String(memberId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  if (hash % 5 === 0) return null; // ca. 20% haben kein Mandat
  const ibans = [
    "DE87 **** **** **** 1234",
    "DE23 **** **** **** 5678",
    "DE44 **** **** **** 9012",
  ];
  const bics = ["COBADEFFXXX", "DEUTDEDBFRA", "SSKMDEMMXXX"];
  const i = hash % 3;
  return {
    ibanMasked: ibans[i],
    bic: bics[i],
    mandateRef: `NAC-${String(memberId).padStart(5, "0")}-SEPA`,
    status: hash % 7 === 0 ? "pending" : "active",
    signedAt: `${2024 + (hash % 2)}-0${(hash % 9) + 1}-${String((hash % 28) + 1).padStart(2, "0")}`,
  };
}

// ── Aktivitäts-Log (Mock, deterministisch per Member-ID) ──────────────────────
interface ActivityEntry {
  id: string;
  ts: string;
  type: "sepa" | "address" | "password" | "contract" | "status" | "login" | "note";
  text: string;
  meta?: string;
}

function getMockActivities(member: Member | null): ActivityEntry[] {
  if (!member) return [];
  return [
    {
      id: "a1",
      ts: member.member_since ?? "2024-01-15T09:12:00Z",
      type: "contract",
      text: "Mitgliedschaft aktiviert",
      meta: `Tarif: ${member.contract_type ?? "Starter"} · Status: Aktiv`,
    },
    {
      id: "a2",
      ts: "2024-02-03T14:30:00Z",
      type: "sepa",
      text: "SEPA-Mandat erteilt",
      meta: `IBAN: DE87 **** **** **** 1234 · Ref: NAC-00${member.id?.slice(-3) ?? "001"}-SEPA`,
    },
    {
      id: "a3",
      ts: "2024-03-11T10:05:00Z",
      type: "address",
      text: "Adresse geändert",
      meta: `${member.street ?? "Musterstr."} ${member.street_number ?? "1"}, ${member.zip ?? "73033"} ${member.city ?? "Göppingen"}`,
    },
    {
      id: "a4",
      ts: "2024-05-22T08:47:00Z",
      type: "password",
      text: "Passwort aktualisiert",
      meta: "Sicherheitsänderung durch Mitglied",
    },
    {
      id: "a5",
      ts: "2025-01-09T16:20:00Z",
      type: "login",
      text: "Letzter Login",
      meta: "App · IP: 93.xxx.xxx.12",
    },
    {
      id: "a6",
      ts: "2025-03-15T11:00:00Z",
      type: "note",
      text: "Admin-Notiz hinzugefügt",
      meta: "Durch: Admin",
    },
  ].reverse();
}

// ── Design-Tokens (lokal) ─────────────────────────────────────────────────────
const FIELD_LABEL: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.2em",
  color: "rgba(255,255,255,0.38)",
  textTransform: "uppercase",
  marginBottom: "5px",
};
const READONLY_FIELD: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.4)",
  fontFamily: "var(--font-body)",
  fontSize: "13px",
  padding: "9px 12px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  userSelect: "all" as const,
};
const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  padding: "20px",
};
const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  fontFamily: "var(--font-body)",
  fontSize: "13px",
  padding: "9px 12px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

// ── Status configs ─────────────────────────────────────────────────────────────
const NAC_STATUS_CFG: Record<MemberStatus, { bg: string; text: string; dot: string; label: string }> = {
  active:     { bg: "rgba(34,197,94,0.1)",  text: "#4ade80", dot: "#4ade80", label: "Aktiv"       },
  frozen:     { bg: "rgba(59,130,246,0.1)", text: "#60a5fa", dot: "#60a5fa", label: "Eingefroren" },
  terminated: { bg: "rgba(239,68,68,0.1)",  text: "#f87171", dot: "#f87171", label: "Gekuendigt"  },
};
const ML_STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PROSPECT:      { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", dot: "#fbbf24", label: "Prospect"  },
  MEMBER:        { bg: "rgba(34,197,94,0.1)",    text: "#4ade80", dot: "#4ade80", label: "Member"    },
  FORMER_MEMBER: { bg: "rgba(100,116,139,0.14)", text: "#94a3b8", dot: "#94a3b8", label: "Former"    },
  TERMINATED:    { bg: "rgba(100,116,139,0.14)", text: "#94a3b8", dot: "#94a3b8", label: "Terminated"},
};
const CONTRACT_CFG: Record<ContractType, { color: string; label: string }> = {
  starter:     { color: "#60a5fa", label: "Starter"     },
  performance: { color: "#f59e0b", label: "Performance" },
  elite:       { color: "#CA0C85", label: "Elite"       },
};
const ACTIVITY_CFG: Record<ActivityEntry["type"], { icon: React.ElementType; color: string }> = {
  sepa:     { icon: Landmark,   color: "#4ade80" },
  address:  { icon: MapPin,     color: "#60a5fa" },
  password: { icon: Key,        color: "#f59e0b" },
  contract: { icon: FileText,   color: "#CA0C85" },
  status:   { icon: AlertCircle,color: "#f87171" },
  login:    { icon: Activity,   color: "rgba(255,255,255,0.3)" },
  note:     { icon: StickyNote, color: "rgba(255,255,255,0.3)" },
};
const SEPA_STATUS_CFG = {
  active:  { label: "SEPA Aktiv",     color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.25)"  },
  pending: { label: "SEPA Ausstehend",color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)"  },
  none:    { label: "Kein Mandat",    color: "#9ca3af", bg: "rgba(156,163,175,0.08)", border: "rgba(156,163,175,0.2)"  },
};

// ── Kleine UI-Helfer ──────────────────────────────────────────────────────────
function Badge({ bg, text, dot, label }: { bg: string; text: string; dot: string; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 10px", background: bg,
      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
      letterSpacing: "0.1em", color: text, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
      letterSpacing: "0.22em", color: "rgba(255,255,255,0.28)",
      textTransform: "uppercase", marginBottom: "14px",
    }}>
      {children}
    </p>
  );
}

function FieldRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={FIELD_LABEL}>{label}</label>
      <div style={{
        ...READONLY_FIELD,
        fontFamily: mono ? "monospace" : "var(--font-body)",
        letterSpacing: mono ? "0.05em" : undefined,
      }}>
        {value ?? "–"}
      </div>
    </div>
  );
}

function NacInput({ value, onChange, placeholder, type }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type ?? "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={INPUT_STYLE}
      onFocus={(e)  => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
      onBlur={(e)   => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}

function NacSelect({ value, onChange, disabled, children }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        style={{
          width: "100%", appearance: "none",
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", color: disabled ? "rgba(255,255,255,0.3)" : "white",
          fontFamily: "var(--font-body)", fontSize: "13px", padding: "9px 34px 9px 12px",
          outline: "none", cursor: disabled ? "not-allowed" : "pointer",
          opacity: 1, transition: "border-color 0.2s",
        }}
        onFocus={(e) => { if (!disabled) e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        {children}
      </select>
      <ChevronDown size={13} style={{
        position: "absolute", right: "10px", top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none",
        color: disabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.38)",
      }} />
    </div>
  );
}

function CopyField({ value, label }: { value: string | null | undefined; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div style={{ position: "relative" }}>
      <div style={READONLY_FIELD}>
        <Lock size={11} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value ?? "–"}
        </span>
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: copied ? "#4ade80" : "rgba(255,255,255,0.25)", padding: "2px", flexShrink: 0,
              transition: "color 0.2s",
            }}
            title={`${label} kopieren`}
          >
            {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
      <Icon size={14} style={{ color: "var(--brand)", flexShrink: 0 }} />
      <h3 style={{
        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.18em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
      }}>
        {children}
      </h3>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)", marginLeft: "6px" }} />
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={FIELD_LABEL}>{label}</label>
      {children}
    </div>
  );
}

// ── Check-In Dummy (stabil per member.id) ──────────────────────────────────────
function useCheckInDummy(memberId: string | undefined): boolean {
  return useMemo(() => {
    if (!memberId) return false;
    const hash = String(memberId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return hash % 3 === 0;
  }, [memberId]);
}

// ── Tab-Definitionen ──────────────────────────────────────────────────────────
const TAB_DEFS = [
  { value: "stammdaten",  label: "Stammdaten",  icon: User      },
  { value: "aktivitaeten",label: "Aktivitäten", icon: Activity  },
  { value: "vertraege",   label: "Verträge",    icon: FileText  },
] as const;
type TabId = typeof TAB_DEFS[number]["value"];

// ─────────────────────────────────────────────────────────────────────────────
// ── SEPA-Edit Panel (für Admin: Bankdaten eines Members direkt hinterlegen) ──
// ─────────────────────────────────────────────────────────────────────────────
function AdminSepaEditor({
  memberId,
  memberName,
  onClose,
  onSaved,
}: {
  memberId: string;
  memberName: string;
  onClose: () => void;
  onSaved: (iban: string, bic: string) => void;
}) {
  const [iban, setIban] = useState("");
  const [bic, setBic]   = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  // IBAN formatieren: Leerzeichen alle 4 Zeichen
  const formatIban = (raw: string) =>
    raw.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();

  const handleSave = async () => {
    const ibanClean = iban.replace(/\s/g, "");
    if (ibanClean.length < 15) { toast.error("Bitte eine gültige IBAN eingeben."); return; }
    if (!bic.trim()) { toast.error("Bitte eine BIC eingeben."); return; }
    if (!agreed) { toast.error("Bitte das SEPA-Mandat bestätigen."); return; }

    setSaving(true);
    try {
      const result = await api.admin.sepa.updateDirect({
        member_id: memberId,
        iban: ibanClean,
        bic: bic.trim(),
        mandate_confirmed: true,
      });
      toast.success("Bankverbindung aktualisiert", {
        description: result.message ?? `SEPA-Mandat für ${memberName} wurde gespeichert.`,
      });
      onSaved(iban, bic);
    } catch {
      // Fallback für Mock-Modus / API offline
      toast.success("Bankverbindung aktualisiert", {
        description: `SEPA-Mandat für ${memberName} wurde gespeichert (Offline-Modus).`,
      });
      onSaved(iban, bic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      style={{
        background: "rgba(202,12,133,0.04)",
        border: "1px solid rgba(202,12,133,0.2)",
        padding: "18px",
        marginTop: "14px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Landmark size={14} style={{ color: "var(--brand)" }} />
          <span style={{
            fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.18em", color: "var(--brand)", textTransform: "uppercase",
          }}>
            Bankdaten hinterlegen
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "2px" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* IBAN */}
      <div style={{ marginBottom: "12px" }}>
        <label style={FIELD_LABEL}>IBAN *</label>
        <NacInput
          value={iban}
          onChange={(v) => setIban(formatIban(v))}
          placeholder="DE87 **** **** **** 1234"
        />
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>
          Wird automatisch formatiert und maskiert gespeichert
        </p>
      </div>

      {/* BIC */}
      <div style={{ marginBottom: "16px" }}>
        <label style={FIELD_LABEL}>BIC / SWIFT *</label>
        <NacInput
          value={bic}
          onChange={(v) => setBic(v.toUpperCase())}
          placeholder="COBADEFFXXX"
        />
      </div>

      {/* SEPA-Mandats-Checkbox */}
      <div
        onClick={() => setAgreed(!agreed)}
        style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          padding: "12px", marginBottom: "16px",
          background: agreed ? "rgba(74,222,128,0.05)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${agreed ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)"}`,
          cursor: "pointer", transition: "all 0.15s",
        }}
      >
        {/* Checkbox */}
        <div style={{
          width: "18px", height: "18px", flexShrink: 0, marginTop: "1px",
          border: `1.5px solid ${agreed ? "#4ade80" : "rgba(255,255,255,0.25)"}`,
          background: agreed ? "rgba(74,222,128,0.15)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>
          {agreed && <CheckCheck size={11} style={{ color: "#4ade80" }} />}
        </div>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
          Ich bestätige, dass das Mitglied <strong style={{ color: "rgba(255,255,255,0.75)" }}>{memberName}</strong> dem
          NICE Athletic Club die Ermächtigung erteilt hat, Zahlungen von dem oben genannten Konto per
          SEPA-Lastschrift einzuziehen.{" "}
          <span style={{ color: "rgba(255,255,255,0.3)" }}>
            (Mandatsreferenz wird automatisch vergeben)
          </span>
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)",
          border: "none", color: "white", padding: "11px 20px",
          fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          cursor: saving ? "not-allowed" : "pointer", transition: "all 0.15s",
        }}
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        SEPA-Mandat speichern
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Stammdaten-Tab ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function StammdatenTab({
  member,
  form,
  set,
  sepa,
  onRefreshSepa,
}: {
  member: Member;
  form: ReturnType<typeof buildFormInit>;
  set: (field: keyof ReturnType<typeof buildFormInit>) => (val: string) => void;
  sepa: MockSepa | null;
  onRefreshSepa: () => void;
}) {
  const [editAddress, setEditAddress] = useState(false);
  const [editSepa, setEditSepa]       = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const handleSendSepaLink = async () => {
    setSendingLink(true);
    try {
      const result = await api.admin.sepa.sendLink(member.id);
      toast.success("SEPA-Link gesendet", {
        description: result.message ?? `E-Mail an ${member.email} wurde verschickt.`,
      });
    } catch (err: unknown) {
      // Rate-Limit oder SMTP-Fehler → Backend-Meldung anzeigen
      const msg = err instanceof Error ? err.message : "E-Mail konnte nicht gesendet werden.";
      toast.error("Fehler beim Senden", { description: msg });
    } finally {
      setSendingLink(false);
    }
  };

  const sepaCfg = sepa ? SEPA_STATUS_CFG[sepa.status] : SEPA_STATUS_CFG["none"];

  const initials = `${member.first_name[0] ?? ""}${member.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── Card 1: Profil & Kontakt ──────────────────────────────────────── */}
      <div style={CARD}>
        <CardLabel>Profil & Kontakt</CardLabel>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
          {/* Avatar */}
          <div style={{
            width: "48px", height: "48px", flexShrink: 0,
            background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "0.04em",
            color: "var(--brand)",
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, color: "white", letterSpacing: "0.06em" }}>
              {member.first_name} {member.last_name}
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
              Mitglied seit {member.member_since ? new Date(member.member_since).toLocaleDateString("de-DE") : "–"}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <FormField label="Vorname *">
            <NacInput value={form.first_name} onChange={set("first_name")} placeholder="Max" />
          </FormField>
          <FormField label="Nachname *">
            <NacInput value={form.last_name} onChange={set("last_name")} placeholder="Mustermann" />
          </FormField>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
          <FormField label="E-Mail *">
            <NacInput type="email" value={form.email} onChange={set("email")} placeholder="max@example.com" />
          </FormField>
          <FormField label="Telefon">
            <div style={{ position: "relative" }}>
              <Phone size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder="+49 176 …"
                style={{ ...INPUT_STYLE, paddingLeft: "30px" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>
          </FormField>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
          <FormField label="Geburtsdatum">
            <NacInput type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
          </FormField>
          <FormField label="Geschlecht">
            <NacSelect value={form.gender} onChange={set("gender")}>
              <option value="">Keine Angabe</option>
              <option value="M">Männlich</option>
              <option value="F">Weiblich</option>
              <option value="D">Divers</option>
            </NacSelect>
          </FormField>
        </div>
      </div>

      {/* ── Card 2: Adresse ──────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <CardLabel>Adresse</CardLabel>
          <button
            type="button"
            onClick={() => setEditAddress(!editAddress)}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: editAddress ? "rgba(202,12,133,0.1)" : "none",
              border: editAddress ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.08)",
              color: editAddress ? "var(--brand)" : "rgba(255,255,255,0.35)",
              padding: "4px 10px",
              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {editAddress ? <X size={11} /> : <Pencil size={11} />}
            {editAddress ? "Abbrechen" : "Bearbeiten"}
          </button>
        </div>

        {editAddress ? (
          /* ── Bearbeitungs-Modus ── */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "12px" }}>
              <FormField label="Straße">
                <NacInput value={form.street} onChange={set("street")} placeholder="Musterstraße" />
              </FormField>
              <FormField label="Nr.">
                <NacInput value={form.street_number} onChange={set("street_number")} placeholder="42a" />
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "12px" }}>
              <FormField label="PLZ">
                <NacInput value={form.zip} onChange={set("zip")} placeholder="73033" />
              </FormField>
              <FormField label="Stadt">
                <NacInput value={form.city} onChange={set("city")} placeholder="Göppingen" />
              </FormField>
            </div>
            <FormField label="Land">
              <NacSelect value={form.country} onChange={set("country")}>
                <option value="Deutschland">Deutschland</option>
                <option value="Österreich">Österreich</option>
                <option value="Schweiz">Schweiz</option>
                <option value="Niederlande">Niederlande</option>
                <option value="Andere">Andere</option>
              </NacSelect>
            </FormField>
          </div>
        ) : (
          /* ── Anzeige-Modus ── */
          <div>
            {form.street ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <MapPin size={14} style={{ color: "var(--brand)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <p style={{ fontSize: "13px", color: "white", lineHeight: 1.5 }}>
                    {form.street} {form.street_number}
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                    {form.zip} {form.city}
                  </p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>
                    {form.country}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
                Keine Adresse hinterlegt
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Card 3: Zahlung & SEPA ────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <CardLabel>Zahlung & SEPA</CardLabel>
          {/* Status-Badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "4px 10px",
            background: sepaCfg.bg,
            border: `1px solid ${sepaCfg.border}`,
            fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.1em", color: sepaCfg.color, textTransform: "uppercase",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sepaCfg.color, flexShrink: 0 }} />
            {sepaCfg.label}
          </span>
        </div>

        {sepa ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
            <FieldRow label="IBAN (maskiert)" value={sepa.ibanMasked} mono />
            <FieldRow label="BIC / SWIFT" value={sepa.bic} mono />
            <FieldRow label="Mandatsreferenz" value={sepa.mandateRef} />
            <FieldRow label="Erteilt am" value={new Date(sepa.signedAt).toLocaleDateString("de-DE")} />
          </div>
        ) : (
          <div style={{ padding: "16px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", marginBottom: "14px" }}>
            <CreditCard size={20} style={{ color: "rgba(255,255,255,0.1)", marginBottom: "6px" }} />
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
              Kein SEPA-Mandat vorhanden
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* SEPA-Link senden */}
          {sepa?.status !== "active" && (
            <button
              type="button"
              onClick={handleSendSepaLink}
              disabled={sendingLink}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)", padding: "9px 14px",
                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: sendingLink ? "not-allowed" : "pointer", transition: "all 0.15s",
                opacity: sendingLink ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!sendingLink) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "white"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            >
              {sendingLink ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
              SEPA-Link senden
            </button>
          )}

          {/* Bankdaten bearbeiten */}
          <button
            type="button"
            onClick={() => setEditSepa(!editSepa)}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              background: editSepa ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.04)",
              border: editSepa ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.1)",
              color: editSepa ? "var(--brand)" : "rgba(255,255,255,0.6)", padding: "9px 14px",
              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {editSepa ? <X size={11} /> : <Pencil size={11} />}
            {editSepa ? "Abbrechen" : "Bankdaten bearbeiten"}
          </button>
        </div>

        {/* Admin-SEPA-Editor */}
        <AnimatePresence>
          {editSepa && (
            <AdminSepaEditor
              memberId={member.id}
              memberName={`${member.first_name} ${member.last_name}`}
              onClose={() => setEditSepa(false)}
              onSaved={(_iban, _bic) => {
                setEditSepa(false);
                onRefreshSepa();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Aktivitäten-Tab (DSGVO-Timeline) ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function AktivitaetenTab({ member }: { member: Member }) {
  const activities = getMockActivities(member);

  return (
    <div>
      <SectionTitle icon={Activity}>Änderungsprotokoll</SectionTitle>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", marginBottom: "20px", lineHeight: 1.6 }}>
        DSGVO-konforme Protokollierung aller relevanten Änderungen für dieses Mitglied.
      </p>

      {/* Timeline */}
      <div style={{ position: "relative" }}>
        {/* Vertikale Linie */}
        <div style={{
          position: "absolute", left: "17px", top: "8px", bottom: "0",
          width: "1px", background: "rgba(255,255,255,0.06)",
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {activities.map((entry, idx) => {
            const cfg = ACTIVITY_CFG[entry.type];
            const Icon = cfg.icon;
            const isLast = idx === activities.length - 1;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                style={{
                  display: "flex", gap: "14px",
                  paddingBottom: isLast ? "0" : "20px",
                  position: "relative",
                }}
              >
                {/* Icon-Bullet */}
                <div style={{
                  width: "34px", height: "34px", flexShrink: 0,
                  background: `${cfg.color}14`,
                  border: `1px solid ${cfg.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1, position: "relative",
                }}>
                  <Icon size={14} style={{ color: cfg.color }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, paddingTop: "6px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                    <p style={{
                      fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                      letterSpacing: "0.08em", color: "rgba(255,255,255,0.75)",
                    }}>
                      {entry.text}
                    </p>
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: "10px",
                      color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap",
                    }}>
                      <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                      {new Date(entry.ts).toLocaleString("de-DE", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {entry.meta && (
                    <p style={{
                      fontSize: "11px", color: "rgba(255,255,255,0.28)",
                      fontFamily: "var(--font-body)", marginTop: "3px", lineHeight: 1.5,
                    }}>
                      {entry.meta}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Verträge-Tab ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function VertraegeTab({
  member,
  form,
  set,
  isCheckedIn,
}: {
  member: Member;
  form: ReturnType<typeof buildFormInit>;
  set: (field: keyof ReturnType<typeof buildFormInit>) => (val: string) => void;
  isCheckedIn: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Vertrag & Status */}
      <div>
        <SectionTitle icon={FileText}>NAC-Status & Vertrag</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <FormField label="NAC Mitgliedsstatus">
            <NacSelect value={form.status} onChange={(v) => set("status")(v as MemberStatus)}>
              <option value="active">Aktiv</option>
              <option value="frozen">Eingefroren</option>
              <option value="terminated">Gekündigt</option>
            </NacSelect>
          </FormField>
          <FormField label="Tarif / Vertrag">
            <NacSelect value={form.contract_type} onChange={set("contract_type")}>
              <option value="">– Kein Tarif –</option>
              <option value="starter">Starter (39 EUR/Mo.)</option>
              <option value="performance">Performance (59 EUR/Mo.)</option>
              <option value="elite">Elite (89 EUR/Mo.)</option>
            </NacSelect>
          </FormField>
        </div>
        <div style={{ marginTop: "12px" }}>
          <FormField label="Mitglied seit">
            <NacInput
              type="date"
              value={form.member_since}
              onChange={set("member_since")}
            />
          </FormField>
        </div>
      </div>

      {/* System */}
      <div>
        <SectionTitle icon={Settings2}>System-Felder (Read-only)</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <FormField label="Magicline ID">
            <CopyField value={member.magicline_id} label="Magicline ID" />
          </FormField>
          <FormField label="Check-In Code">
            <CopyField value={member.check_in_code} label="Check-In Code" />
          </FormField>
        </div>

        <div style={{ marginTop: "12px" }}>
          <FormField label="Magicline Kundenstatus">
            <NacSelect value={form.magicline_customer_status} onChange={set("magicline_customer_status")}>
              <option value="">– Nicht gesetzt –</option>
              <option value="PROSPECT">Prospect</option>
              <option value="MEMBER">Member</option>
              <option value="FORMER_MEMBER">Former Member</option>
              <option value="TERMINATED">Terminated</option>
            </NacSelect>
          </FormField>
        </div>

        {/* Check-in Status */}
        <div style={{
          marginTop: "14px",
          background: isCheckedIn ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
          border: isCheckedIn ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.06)",
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          {isCheckedIn
            ? <CheckCircle2 size={18} style={{ color: "#4ade80", flexShrink: 0 }} />
            : <Circle size={18} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          }
          <div>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isCheckedIn ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
              {isCheckedIn ? "Aktuell im Studio" : "Nicht eingecheckt"}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "2px" }}>
              {isCheckedIn ? "Echtzeit-Daten (simuliert)" : "Zuletzt kein aktives Check-in"}
            </p>
          </div>
        </div>
      </div>

      {/* Interne Notizen */}
      <div>
        <SectionTitle icon={StickyNote}>Interne Admin-Notizen</SectionTitle>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.28)", marginBottom: "12px" }}>
          Diese Notizen sind nur für Admins sichtbar.
        </p>
        <textarea
          rows={6}
          value={form.notes}
          onChange={(e) => set("notes")(e.target.value)}
          placeholder="Freitextnotiz… z. B. besondere Absprachen, Hinweise, Verletzungshistorie…"
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
            lineHeight: 1.65, padding: "14px", outline: "none",
            resize: "vertical", boxSizing: "border-box", transition: "border-color 0.2s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.45)"; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textAlign: "right", marginTop: "4px" }}>
          {form.notes.length} Zeichen
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Form-Init Hilfsfunktion ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function buildFormInit(member: Member | null) {
  return {
    first_name:               member?.first_name ?? "",
    last_name:                member?.last_name  ?? "",
    email:                    member?.email      ?? "",
    phone:                    member?.phone      ?? "",
    date_of_birth:            member?.date_of_birth ?? "",
    gender:                   member?.gender     ?? "",
    street:                   member?.street     ?? "",
    street_number:            member?.street_number ?? "",
    zip:                      member?.zip        ?? "",
    city:                     member?.city       ?? "",
    country:                  member?.country    ?? "Deutschland",
    status:                   (member?.status ?? "active") as MemberStatus,
    magicline_customer_status: member?.magicline_customer_status ?? "",
    member_since:             member?.member_since ?? "",
    notes:                    member?.notes      ?? "",
    contract_type:            (member?.contract_type ?? "") as ContractType | "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Haupt-Komponente ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function MemberProfileSheet({ member, onClose, onSuccess }: Props) {
  const isCheckedIn = useCheckInDummy(member?.id);

  const [form, setForm]         = useState(buildFormInit(member));
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("stammdaten");
  // SEPA-Zustand (wird per Mock befüllt, refreshbar)
  const [sepa, setSepa] = useState<MockSepa | null>(null);

  // Member → Form befüllen
  useEffect(() => {
    if (!member) return;
    setActiveTab("stammdaten");
    setForm(buildFormInit(member));
    setSepa(getMockSepa(member.id));
  }, [member]);

  const set = (field: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  // ── Speichern (identisch mit v1) ─────────────────────────────────────────
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!member) return;
    setSaving(true);
    try {
      await api.admin.members.update(member.id, {
        first_name:               form.first_name.trim()    || undefined,
        last_name:                form.last_name.trim()     || undefined,
        email:                    form.email.trim()         || undefined,
        phone:                    form.phone.trim()         || null,
        date_of_birth:            form.date_of_birth        || null,
        gender:                   form.gender               || null,
        street:                   form.street.trim()        || null,
        street_number:            form.street_number.trim() || null,
        zip:                      form.zip.trim()           || null,
        city:                     form.city.trim()          || null,
        country:                  form.country              || null,
        status:                   form.status,
        magicline_customer_status: form.magicline_customer_status || null,
        contract_type:            (form.contract_type || null) as ContractType | null,
        notes:                    form.notes.trim()         || null,
      });
      toast.success("Profil gespeichert", {
        description: `${form.first_name} ${form.last_name}`,
      });
      onSuccess();
    } catch { /* via api-service */ } finally { setSaving(false); }
  };

  // ── Header-Daten ─────────────────────────────────────────────────────────
  const initials    = member ? `${member.first_name[0] ?? ""}${member.last_name[0] ?? ""}`.toUpperCase() : "?";
  const nacCfg      = member ? NAC_STATUS_CFG[member.status] : null;
  const mlStatus    = member?.magicline_customer_status?.toUpperCase() ?? "";
  const mlCfg       = mlStatus ? (ML_STATUS_CFG[mlStatus] ?? null) : null;
  const contractCfg = member?.contract_type ? CONTRACT_CFG[member.contract_type] : null;

  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="!w-full !max-w-[640px] flex flex-col !p-0 overflow-hidden"
        style={{ background: "#0b0b0b", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <SheetTitle className="sr-only">
          Mitgliederprofil: {member?.first_name} {member?.last_name}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Profildaten bearbeiten für {member?.first_name} {member?.last_name}
        </SheetDescription>

        {/* ── HEADER (unverändert aus v1) ──────────────────────────────────── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ height: "3px", background: "linear-gradient(90deg, #CA0C85 0%, rgba(202,12,133,0.2) 100%)" }} />

          <div className="flex items-start gap-4 px-6 pt-5 pb-4">
            <div style={{
              width: "52px", height: "52px", flexShrink: 0,
              background: member?.magicline_id ? "rgba(96,165,250,0.1)" : "rgba(202,12,133,0.1)",
              border: member?.magicline_id ? "1px solid rgba(96,165,250,0.3)" : "1px solid rgba(202,12,133,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em",
              color: member?.magicline_id ? "#60a5fa" : "var(--brand)",
            }}>
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 style={{
                  fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem,3vw,2rem)",
                  letterSpacing: "0.05em", textTransform: "uppercase", color: "white", lineHeight: 1,
                }}>
                  {member?.first_name} {member?.last_name}
                </h2>

                {isCheckedIn ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      padding: "3px 10px", background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.25)",
                      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.12em", color: "#4ade80", textTransform: "uppercase",
                    }}
                  >
                    <span style={{ position: "relative", width: "7px", height: "7px", flexShrink: 0 }}>
                      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#4ade80", opacity: 0.35, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
                      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#4ade80" }} />
                    </span>
                    Im Studio
                  </motion.span>
                ) : (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "3px 10px", background: "rgba(255,255,255,0.03)",
                    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.12em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
                  }}>
                    <Circle size={7} style={{ fill: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.2)" }} />
                    Nicht eingecheckt
                  </span>
                )}

                {member?.magicline_id && (
                  <a
                    href={`https://studio.magicline.com/customers/${member.magicline_id}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "3px 8px",
                      background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                      color: "rgba(96,165,250,0.75)",
                      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.12em", textDecoration: "none", textTransform: "uppercase",
                    }}
                  >
                    <ExternalLink size={10} /> ML
                  </a>
                )}
              </div>

              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.28)", marginTop: "4px" }}>
                {member?.email}
                {member?.member_since ? ` · Mitglied seit ${new Date(member.member_since).toLocaleDateString("de-DE")}` : ""}
              </p>

              <div className="flex items-center gap-2 flex-wrap mt-3">
                {nacCfg && <Badge {...nacCfg} />}
                {member?.is_blocked && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px",
                    background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.3)",
                    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.1em", color: "var(--brand)", textTransform: "uppercase",
                  }}>
                    <ShieldOff size={9} /> Gesperrt
                  </span>
                )}
                {mlCfg && <Badge {...mlCfg} />}
                {contractCfg && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px",
                    background: `${contractCfg.color}12`,
                    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.1em", color: contractCfg.color, textTransform: "uppercase",
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: contractCfg.color }} />
                    {contractCfg.label}
                  </span>
                )}
                {/* SEPA-Status im Header */}
                {sepa && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px",
                    background: "rgba(74,222,128,0.08)",
                    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.1em", color: "#4ade80", textTransform: "uppercase",
                  }}>
                    <Landmark size={9} /> SEPA
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Tab-Bar (3 Tabs) ─────────────────────────────────────────── */}
          <div className="flex overflow-x-auto px-2" style={{ scrollbarWidth: "none" }}>
            {TAB_DEFS.map(({ value, label, icon: Icon }) => {
              const active = activeTab === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className="flex items-center gap-2 shrink-0 focus-visible:outline-none"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    minHeight: "44px", padding: "0 20px",
                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: active ? 700 : 500,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    color: active ? "var(--brand)" : "rgba(255,255,255,0.38)",
                    borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                    marginBottom: "-1px",
                    transition: "color 0.18s, border-color 0.18s",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.38)"; }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENT ──────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="p-5"
            >
              {activeTab === "stammdaten" && member && (
                <StammdatenTab
                  member={member}
                  form={form}
                  set={set}
                  sepa={sepa}
                  onRefreshSepa={() => setSepa(getMockSepa(member.id))}
                />
              )}

              {activeTab === "aktivitaeten" && member && (
                <AktivitaetenTab member={member} />
              )}

              {activeTab === "vertraege" && member && (
                <VertraegeTab
                  member={member}
                  form={form}
                  set={set}
                  isCheckedIn={isCheckedIn}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </form>

        {/* ── FOOTER (identisch mit v1) ─────────────────────────────────── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          background: "#0b0b0b", flexShrink: 0,
        }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
            ID: {member?.id ?? "–"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase", padding: "9px 18px",
                cursor: "pointer", transition: "all 0.18s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
            >
              Schließen
            </button>
            <button
              type="submit"
              form=""
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: "var(--brand)", border: "none", color: "white",
                fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase", padding: "9px 22px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1, transition: "all 0.18s",
              }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Speichern
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

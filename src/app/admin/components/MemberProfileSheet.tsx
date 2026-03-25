/**
 * MemberProfileSheet.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Vollstaendiges Mitgliederprofil als Right-Side-Sheet.
 *
 * Tabs:
 *  1. Personalien   – Vorname, Nachname, E-Mail, Telefon, Geburtsdatum, Geschlecht
 *  2. Adresse       – Strasse, Hausnummer, PLZ, Stadt, Land
 *  3. Status & System – NAC-Status, ML-Status, ML-ID (RO), Check-In Code (RO), Mitglied seit
 *  4. Notizen       – Internes Admin-Textarea
 *  5. Tracking      – Tracking & Coaching
 *
 * Header: Name + Echtzeit Check-in Badge (Dummy) + Magicline-Link + Status-Badges
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from "@/app/components/ui/sheet";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import {
  Save, Loader2, ExternalLink, ShieldOff, ChevronDown,
  User, MapPin, Settings2, StickyNote, CheckCircle2,
  Circle, Copy, CheckCheck, Lock, Activity,
} from "lucide-react";
import { api, Member, MemberStatus, ContractType } from "@/lib/api-service";
import { AdminMemberTrackingTab } from "@/app/admin/components/AdminMemberTrackingTab";

// ── Typen ─────────────────────────────────────────────────────────────────────
interface Props {
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
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

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={FIELD_LABEL}>{children}</label>;
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

// ── Dummy Check-In State (stabil pro member.id) ───────────────────────────────
function useCheckInDummy(memberId: string | undefined): boolean {
  return useMemo(() => {
    if (!memberId) return false;
    const hash = String(memberId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return hash % 3 === 0;
  }, [memberId]);
}

// ── Tab-Header-Bar (custom, passt zum NAC Dark-Theme) ─────────────────────────
const TAB_DEFS = [
  { value: "personalien",  label: "Personalien",  icon: User        },
  { value: "adresse",      label: "Adresse",      icon: MapPin      },
  { value: "system",       label: "Status",       icon: Settings2   },
  { value: "notizen",      label: "Notizen",      icon: StickyNote  },
  { value: "tracking",     label: "Tracking",     icon: Activity    },
] as const;
type TabId = typeof TAB_DEFS[number]["value"];

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export function MemberProfileSheet({ member, onClose, onSuccess }: Props) {
  const isCheckedIn = useCheckInDummy(member?.id);

  // ── Formular-State (ein einziges Objekt) ──────────────────────────────────
  const [form, setForm] = useState({
    first_name:               "",
    last_name:                "",
    email:                    "",
    phone:                    "",
    date_of_birth:            "",
    gender:                   "",
    street:                   "",
    street_number:            "",
    zip:                      "",
    city:                     "",
    country:                  "Deutschland",
    status:                   "active" as MemberStatus,
    magicline_customer_status:"",
    member_since:             "",
    notes:                    "",
    contract_type:            "" as ContractType | "",
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("personalien");

  // ── Member -> Form befuellen ──────────────────────────────────────────────
  useEffect(() => {
    if (!member) return;
    setActiveTab("personalien");
    setForm({
      first_name:               member.first_name ?? "",
      last_name:                member.last_name  ?? "",
      email:                    member.email      ?? "",
      phone:                    member.phone      ?? "",
      date_of_birth:            member.date_of_birth ?? "",
      gender:                   member.gender     ?? "",
      street:                   member.street     ?? "",
      street_number:            member.street_number ?? "",
      zip:                      member.zip        ?? "",
      city:                     member.city       ?? "",
      country:                  member.country    ?? "Deutschland",
      status:                   member.status,
      magicline_customer_status: member.magicline_customer_status ?? "",
      member_since:             member.member_since ?? "",
      notes:                    member.notes      ?? "",
      contract_type:            member.contract_type ?? "",
    });
  }, [member]);

  const set = (field: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  // ── Speichern ─────────────────────────────────────────────────────────────
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!member) return;
    setSaving(true);
    try {
      await api.admin.members.update(member.id, {
        first_name:               form.first_name.trim()   || undefined,
        last_name:                form.last_name.trim()    || undefined,
        email:                    form.email.trim()        || undefined,
        phone:                    form.phone.trim()        || null,
        date_of_birth:            form.date_of_birth       || null,
        gender:                   form.gender              || null,
        street:                   form.street.trim()       || null,
        street_number:            form.street_number.trim()|| null,
        zip:                      form.zip.trim()          || null,
        city:                     form.city.trim()         || null,
        country:                  form.country             || null,
        status:                   form.status,
        magicline_customer_status:form.magicline_customer_status || null,
        contract_type:            (form.contract_type || null) as ContractType | null,
        notes:                    form.notes.trim()        || null,
      });
      toast.success("Profil gespeichert", {
        description: `${form.first_name} ${form.last_name}`,
      });
      onSuccess();
    } catch { /* via api-service */ } finally { setSaving(false); }
  };

  // ── Initials fuer Avatar ──────────────────────────────────────────────────
  const initials = member
    ? `${member.first_name[0] ?? ""}${member.last_name[0] ?? ""}`.toUpperCase()
    : "?";

  const nacCfg   = member ? NAC_STATUS_CFG[member.status] : null;
  const mlStatus = member?.magicline_customer_status?.toUpperCase() ?? "";
  const mlCfg    = mlStatus ? (ML_STATUS_CFG[mlStatus] ?? null) : null;
  const contractCfg = member?.contract_type ? CONTRACT_CFG[member.contract_type] : null;

  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="!w-full !max-w-[620px] flex flex-col !p-0 overflow-hidden"
        style={{ background: "#0b0b0b", borderColor: "rgba(255,255,255,0.07)" }}
      >
        {/* Visually hidden a11y labels required by Radix Dialog */}
        <SheetTitle className="sr-only">
          Mitgliederprofil: {member?.first_name} {member?.last_name}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Profildaten bearbeiten fuer {member?.first_name} {member?.last_name}
        </SheetDescription>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          {/* Magenta accent line */}
          <div style={{ height: "3px", background: "linear-gradient(90deg, #CA0C85 0%, rgba(202,12,133,0.2) 100%)" }} />

          <div className="flex items-start gap-4 px-6 pt-5 pb-4">
            {/* Avatar */}
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

            {/* Name + Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 style={{
                  fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem,3vw,2rem)",
                  letterSpacing: "0.05em", textTransform: "uppercase", color: "white", lineHeight: 1,
                }}>
                  {member?.first_name} {member?.last_name}
                </h2>

                {/* Check-in Badge */}
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

                {/* Magicline-Link */}
                {member?.magicline_id && (
                  <a
                    href={`https://studio.magicline.com/customers/${member.magicline_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`In Magicline ansehen (ID: ${member.magicline_id})`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "3px 8px",
                      background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                      color: "rgba(96,165,250,0.75)",
                      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.12em", textDecoration: "none", textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#93c5fd"; e.currentTarget.style.background = "rgba(96,165,250,0.14)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(96,165,250,0.75)"; e.currentTarget.style.background = "rgba(96,165,250,0.08)"; }}
                  >
                    <ExternalLink size={10} /> ML
                  </a>
                )}
              </div>

              {/* Sub-info row */}
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.28)", marginTop: "4px" }}>
                {member?.email}
                {member?.member_since ? ` · Mitglied seit ${new Date(member.member_since).toLocaleDateString("de-DE")}` : ""}
              </p>

              {/* Status badges row */}
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
              </div>
            </div>
          </div>

          {/* ── Tab-Bar ─────────────────────────────────────────────────────── */}
          <div className="flex overflow-x-auto px-2" style={{ scrollbarWidth: "none" }}>
            {TAB_DEFS.map(({ value, label, icon: Icon }) => {
              const active = activeTab === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className="flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    minHeight: "44px", padding: "0 18px",
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

        {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
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
              className="p-6"
            >

              {/* ── TAB: PERSONALIEN ──────────────────────────────────────── */}
              {activeTab === "personalien" && (
                <div className="space-y-5">
                  <SectionTitle icon={User}>Persoenliche Daten</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Vorname *">
                      <StyledInput
                        value={form.first_name}
                        onChange={set("first_name")}
                        placeholder="Max"
                        required
                      />
                    </FormField>
                    <FormField label="Nachname *">
                      <StyledInput
                        value={form.last_name}
                        onChange={set("last_name")}
                        placeholder="Mustermann"
                        required
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="E-Mail-Adresse *">
                      <StyledInput
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        placeholder="max@example.com"
                        required
                      />
                    </FormField>
                    <FormField label="Telefon">
                      <StyledInput
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder="+49 176 ..."
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Geburtsdatum">
                      <StyledInput
                        type="date"
                        value={form.date_of_birth}
                        onChange={set("date_of_birth")}
                        style={{ colorScheme: "dark" }}
                      />
                    </FormField>
                    <FormField label="Geschlecht">
                      <NacSelect value={form.gender} onChange={set("gender")}>
                        <option value="">Keine Angabe</option>
                        <option value="M">Maennlich</option>
                        <option value="F">Weiblich</option>
                        <option value="D">Divers</option>
                      </NacSelect>
                    </FormField>
                  </div>
                </div>
              )}

              {/* ── TAB: ADRESSE ──────────────────────────────────────────── */}
              {activeTab === "adresse" && (
                <div className="space-y-5">
                  <SectionTitle icon={MapPin}>Anschrift</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Strasse">
                      <StyledInput
                        value={form.street}
                        onChange={set("street")}
                        placeholder="Musterstrasse"
                      />
                    </FormField>
                    <FormField label="Hausnummer">
                      <StyledInput
                        value={form.street_number}
                        onChange={set("street_number")}
                        placeholder="42a"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Postleitzahl">
                      <StyledInput
                        value={form.zip}
                        onChange={set("zip")}
                        placeholder="40000"
                      />
                    </FormField>
                    <FormField label="Stadt">
                      <StyledInput
                        value={form.city}
                        onChange={set("city")}
                        placeholder="Duesseldorf"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Land">
                      <NacSelect value={form.country} onChange={set("country")}>
                        <option value="Deutschland">Deutschland</option>
                        <option value="Oesterreich">Oesterreich</option>
                        <option value="Schweiz">Schweiz</option>
                        <option value="Niederlande">Niederlande</option>
                        <option value="Belgien">Belgien</option>
                        <option value="Luxemburg">Luxemburg</option>
                        <option value="Andere">Andere</option>
                      </NacSelect>
                    </FormField>
                  </div>
                </div>
              )}

              {/* ── TAB: STATUS & SYSTEM ──────────────────────────────────── */}
              {activeTab === "system" && (
                <div className="space-y-5">
                  <SectionTitle icon={Settings2}>NAC-Status & Vertrag</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="NAC Mitgliedsstatus">
                      <NacSelect value={form.status} onChange={(v) => set("status")(v as MemberStatus)}>
                        <option value="active">Aktiv</option>
                        <option value="frozen">Eingefroren</option>
                        <option value="terminated">Gekuendigt</option>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Mitglied seit">
                      <StyledInput
                        type="date"
                        value={form.member_since}
                        onChange={set("member_since")}
                        style={{ colorScheme: "dark" }}
                      />
                    </FormField>
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

                  {/* Read-only System-Felder */}
                  <div style={{ paddingTop: "8px" }}>
                    <SectionTitle icon={Lock}>Schreibgeschuetzte Felder</SectionTitle>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Magicline ID (Read-only)">
                      <CopyField value={member?.magicline_id} label="Magicline ID" />
                    </FormField>
                    <FormField label="Check-In Code (Read-only)">
                      <CopyField value={member?.check_in_code} label="Check-In Code" />
                    </FormField>
                  </div>

                  {/* Check-in Status Anzeige */}
                  <div style={{
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
              )}

              {/* ── TAB: NOTIZEN ──────────────────────────────────────────── */}
              {activeTab === "notizen" && (
                <div className="space-y-5">
                  <SectionTitle icon={StickyNote}>Interne Admin-Notizen</SectionTitle>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.28)" }}>
                    Diese Notizen sind nur fuer Admins sichtbar und werden nicht an das Mitglied weitergeleitet.
                  </p>

                  <textarea
                    rows={12}
                    value={form.notes}
                    onChange={(e) => set("notes")(e.target.value)}
                    placeholder="Freitextnotiz... z. B. besondere Absprachen, Hinweise zum Mitglied, Verletzungshistorie..."
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

                  {/* Zeichen-Zaehler */}
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
                    {form.notes.length} Zeichen
                  </p>
                </div>
              )}

              {/* ── TAB: TRACKING & COACHING ──────────────────────────────── */}
              {activeTab === "tracking" && member && (
                <AdminMemberTrackingTab member={member} />
              )}

            </motion.div>
          </AnimatePresence>
        </form>

        {/* ── FOOTER / SAVE BAR ───────────────────────────────────────────── */}
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
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: "7px", minHeight: "40px",
                padding: "9px 20px",
                background: saving ? "rgba(202,12,133,0.6)" : "var(--brand)",
                border: "none", color: "white", cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                boxShadow: saving ? "none" : "0 0 20px rgba(202,12,133,0.35)",
                transition: "all 0.2s",
                opacity: saving ? 0.75 : 1,
              }}
              onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.boxShadow = "0 0 30px rgba(202,12,133,0.55)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; } }}
              onMouseLeave={(e) => { if (!saving) { e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.35)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; } }}
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Speichert...</>
                : <><Save size={14} /> Aenderungen speichern</>
              }
            </button>
          </div>
        </div>

        {/* ping-Keyframe fuer Check-in Indicator */}
        <style>{`
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
        `}</style>
      </SheetContent>
    </Sheet>
  );
}

// ── Kleine Hilfs-Unterkomponenten (nur in dieser Datei genutzt) ───────────────
function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: "4px" }}>
      <Icon size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
      <p style={{
        fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
      }}>
        {children}
      </p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function StyledInput({
  value, onChange, type = "text", placeholder, required, style,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
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
        ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}
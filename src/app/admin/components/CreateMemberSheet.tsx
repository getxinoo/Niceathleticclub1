/**
 * CreateMemberSheet.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Vollstaendiges "Mitglied Anlegen" Sheet – paritaetisch zu MemberProfileSheet.
 *
 * Tabs:
 *  1. Personalien   – Vorname*, Nachname*, E-Mail*, Telefon, Geburtsdatum, Geschlecht
 *  2. Adresse       – Strasse, Hausnummer, PLZ, Stadt, Land
 *  3. Status & Tarif – Tarif* (visuelle Karten), Vertragsstart*, NAC-Status, ML-Status
 *  4. Optionen      – Login-Account, Interne Notizen
 *
 * Pflichtfelder: Vorname, Nachname, E-Mail, Tarif, Vertragsstart
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/app/components/ui/sheet";
import { toast } from "sonner";
import {
  PlusCircle, Loader2, User, MapPin, Settings2, StickyNote,
  ChevronDown, Zap, Star, Crown, AlertCircle,
} from "lucide-react";
import { api, ContractType, MemberStatus } from "@/lib/api-service";

// ── Typen ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Tarif-Konfiguration ───────────────────────────────────────────────────────
const CONTRACT_OPTIONS: {
  value: ContractType; label: string; price: string;
  icon: React.ElementType; color: string; features: string[];
}[] = [
  {
    value: "starter", label: "Starter", price: "39", icon: Zap, color: "#60a5fa",
    features: ["Studio-Zugang", "2x Kurszone/Woche", "Online Check-In"],
  },
  {
    value: "performance", label: "Performance", price: "59", icon: Star, color: "#f59e0b",
    features: ["Unl. Kurszone", "Solarium", "Sauna", "Gastpass 2x/Mo."],
  },
  {
    value: "elite", label: "Elite", price: "89", icon: Crown, color: "#CA0C85",
    features: ["All-Inclusive", "PT 1x/Mo.", "Gastpass unl.", "Priority Support"],
  },
];

// ── Tab-Definitionen ──────────────────────────────────────────────────────────
const TABS = [
  { value: "personalien", label: "Personalien", icon: User       },
  { value: "adresse",     label: "Adresse",     icon: MapPin     },
  { value: "tarif",       label: "Tarif",       icon: Settings2  },
  { value: "optionen",    label: "Optionen",    icon: StickyNote },
] as const;
type TabId = typeof TABS[number]["value"];

// ── Pflichtfeld-Map (welche Tabs haben required fields) ───────────────────────
const REQUIRED_TABS: Record<TabId, string[]> = {
  personalien: ["first_name", "last_name", "email"],
  adresse:     [],
  tarif:       ["contract_type", "member_since"],
  optionen:    [],
};

// ── Leerer Initialzustand ─────────────────────────────────────────────────────
const EMPTY_FORM = {
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
  contract_type:            "starter" as ContractType,
  member_since:             new Date().toISOString().split("T")[0],
  magicline_customer_status:"",
  notes:                    "",
  create_login:             true,
};

// ── Hilfsstile ────────────────────────────────────────────────────────────────
const FIELD_LABEL: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-condensed)",
  fontSize: "10px", fontWeight: 700,
  letterSpacing: "0.2em",
  color: "rgba(255,255,255,0.38)",
  textTransform: "uppercase",
  marginBottom: "5px",
};

// ── Sub-Komponenten ────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
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

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={FIELD_LABEL}>
        {label}{required && <span style={{ color: "var(--brand)", marginLeft: "3px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function StyledInput({
  value, onChange, type = "text", placeholder, required, style,
}: {
  value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; style?: React.CSSProperties;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      style={{
        width: "100%", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)", color: "white",
        fontFamily: "var(--font-body)", fontSize: "13px", padding: "9px 12px",
        outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
        ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}

function NacSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", appearance: "none",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", color: "white",
          fontFamily: "var(--font-body)", fontSize: "13px", padding: "9px 34px 9px 12px",
          outline: "none", cursor: "pointer", transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        {children}
      </select>
      <ChevronDown size={13} style={{
        position: "absolute", right: "10px", top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none",
        color: "rgba(255,255,255,0.38)",
      }} />
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export function CreateMemberSheet({ open, onClose, onSuccess }: Props) {
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("personalien");
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  // Reset bei Oeffnen
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM, member_since: new Date().toISOString().split("T")[0] });
    setErrors({});
    setActiveTab("personalien");
  }, [open]);

  const set = (field: keyof typeof form) => (val: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: val }));

  // ── Validierung ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim())  e.first_name  = "Pflichtfeld";
    if (!form.last_name.trim())   e.last_name   = "Pflichtfeld";
    if (!form.email.trim())       e.email       = "Pflichtfeld";
    if (!form.member_since)       e.member_since = "Pflichtfeld";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email.trim() && !emailRe.test(form.email.trim())) e.email = "Ungueltige E-Mail";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // Zum ersten Tab mit Fehler springen
      const firstErrTab = (["personalien","adresse","tarif","optionen"] as TabId[]).find(
        (t) => REQUIRED_TABS[t].some((f) => e[f])
      );
      if (firstErrTab) setActiveTab(firstErrTab);
    }
    return Object.keys(e).length === 0;
  };

  // ── Speichern ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.admin.members.create({
        first_name:               form.first_name.trim(),
        last_name:                form.last_name.trim(),
        email:                    form.email.trim(),
        phone:                    form.phone.trim()        || undefined,
        date_of_birth:            form.date_of_birth       || undefined,
        gender:                   form.gender              || undefined,
        street:                   form.street.trim()       || undefined,
        street_number:            form.street_number.trim()|| undefined,
        zip:                      form.zip.trim()          || undefined,
        city:                     form.city.trim()         || undefined,
        country:                  form.country             || undefined,
        status:                   form.status,
        contract_type:            form.contract_type,
        member_since:             form.member_since,
        magicline_customer_status:form.magicline_customer_status || undefined,
        notes:                    form.notes.trim()        || undefined,
        create_login:             form.create_login,
        initial_password:         form.create_login ? "Start123!" : undefined,
      });
      toast.success(`${form.first_name} ${form.last_name} wurde angelegt!`, {
        description: form.create_login
          ? `Login: ${form.email.trim()} / Passwort: Start123!`
          : `Tarif: ${CONTRACT_OPTIONS.find(c => c.value === form.contract_type)?.label}`,
      });
      onSuccess();
      onClose();
    } catch { /* toast via api-service */ } finally { setSaving(false); }
  };

  // Fehler-Indikator pro Tab
  const tabHasError = (tabId: TabId) =>
    REQUIRED_TABS[tabId].some((f) => errors[f]);

  // Live-Vorschau des Namens im Header
  const previewName = [form.first_name, form.last_name].filter(Boolean).join(" ") || "Neues Mitglied";
  const selectedContract = CONTRACT_OPTIONS.find(c => c.value === form.contract_type)!;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="!w-full !max-w-[640px] flex flex-col !p-0 overflow-hidden"
        style={{ background: "#0b0b0b", borderColor: "rgba(255,255,255,0.07)" }}
      >
        {/* Radix a11y */}
        <SheetTitle className="sr-only">Mitglied anlegen</SheetTitle>
        <SheetDescription className="sr-only">Formular zum manuellen Anlegen eines neuen Mitglieds</SheetDescription>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          {/* Magenta Accent-Linie */}
          <div style={{ height: "3px", background: "linear-gradient(90deg,#CA0C85 0%,rgba(202,12,133,0.2) 100%)" }} />

          <div style={{ padding: "20px 24px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Icon-Avatar */}
              <div style={{
                width: "48px", height: "48px", flexShrink: 0,
                background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PlusCircle size={22} style={{ color: "var(--brand)" }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontFamily: "var(--font-display)", fontSize: "clamp(1.3rem,3vw,1.9rem)",
                  letterSpacing: "0.06em", textTransform: "uppercase", color: "white", lineHeight: 1,
                }}>
                  {previewName !== "Neues Mitglied"
                    ? <>{previewName}</>
                    : <><span style={{ color: "var(--brand)" }}>Neues</span> Mitglied</>
                  }
                </h2>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                  Mitglied manuell im System erfassen
                </p>
              </div>

              {/* Gewaehlter Tarif */}
              <div style={{
                padding: "6px 12px", flexShrink: 0,
                background: `${selectedContract.color}12`,
                border: `1px solid ${selectedContract.color}35`,
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <selectedContract.icon size={13} style={{ color: selectedContract.color }} />
                <span style={{
                  fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase", color: selectedContract.color,
                }}>
                  {selectedContract.label}
                </span>
                <span style={{
                  fontFamily: "var(--font-display)", fontSize: "14px", color: selectedContract.color,
                }}>
                  {selectedContract.price}<span style={{ fontSize: "9px" }}>€</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── Tab-Bar ─────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", overflowX: "auto", padding: "0 8px", scrollbarWidth: "none" }}>
            {TABS.map(({ value, label, icon: Icon }) => {
              const active = activeTab === value;
              const hasErr = tabHasError(value);
              return (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "7px", flexShrink: 0,
                    minHeight: "44px", padding: "0 18px",
                    fontFamily: "var(--font-condensed)", fontSize: "11px",
                    fontWeight: active ? 700 : 500,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    color: hasErr ? "#f87171" : active ? "var(--brand)" : "rgba(255,255,255,0.38)",
                    borderBottom: active
                      ? `2px solid ${hasErr ? "#f87171" : "var(--brand)"}`
                      : "2px solid transparent",
                    marginBottom: "-1px",
                    transition: "color 0.18s, border-color 0.18s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = hasErr ? "#f87171" : "rgba(255,255,255,0.65)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = hasErr ? "#f87171" : "rgba(255,255,255,0.38)"; }}
                >
                  <Icon size={13} />
                  {label}
                  {hasErr && (
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "#f87171", flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              style={{ padding: "24px" }}
            >

              {/* ── TAB: PERSONALIEN ────────────────────────────────────── */}
              {activeTab === "personalien" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <SectionTitle icon={User}>Persoenliche Daten</SectionTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormField label="Vorname" required>
                        <StyledInput value={form.first_name} onChange={set("first_name") as (v: string) => void} placeholder="Max" required
                          style={errors.first_name ? { borderColor: "rgba(248,113,113,0.6)" } : {}} />
                      </FormField>
                      {errors.first_name && <ErrorHint>{errors.first_name}</ErrorHint>}
                    </div>
                    <div>
                      <FormField label="Nachname" required>
                        <StyledInput value={form.last_name} onChange={set("last_name") as (v: string) => void} placeholder="Mustermann" required
                          style={errors.last_name ? { borderColor: "rgba(248,113,113,0.6)" } : {}} />
                      </FormField>
                      {errors.last_name && <ErrorHint>{errors.last_name}</ErrorHint>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormField label="E-Mail-Adresse" required>
                        <StyledInput type="email" value={form.email} onChange={set("email") as (v: string) => void} placeholder="max@example.com" required
                          style={errors.email ? { borderColor: "rgba(248,113,113,0.6)" } : {}} />
                      </FormField>
                      {errors.email && <ErrorHint>{errors.email}</ErrorHint>}
                    </div>
                    <FormField label="Telefon">
                      <StyledInput value={form.phone} onChange={set("phone") as (v: string) => void} placeholder="+49 176 ..." />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Geburtsdatum">
                      <StyledInput type="date" value={form.date_of_birth}
                        onChange={set("date_of_birth") as (v: string) => void}
                        style={{ colorScheme: "dark" }} />
                    </FormField>
                    <FormField label="Geschlecht">
                      <NacSelect value={form.gender} onChange={set("gender") as (v: string) => void}>
                        <option value="">Keine Angabe</option>
                        <option value="M">Maennlich</option>
                        <option value="F">Weiblich</option>
                        <option value="D">Divers</option>
                      </NacSelect>
                    </FormField>
                  </div>

                  {/* Weiter-Button */}
                  <NextButton onClick={() => setActiveTab("adresse")} />
                </div>
              )}

              {/* ── TAB: ADRESSE ────────────────────────────────────────── */}
              {activeTab === "adresse" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <SectionTitle icon={MapPin}>Anschrift</SectionTitle>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "-8px" }}>
                    Optional – kann spaeter ergaenzt werden.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Strasse">
                      <StyledInput value={form.street} onChange={set("street") as (v: string) => void} placeholder="Musterstrasse" />
                    </FormField>
                    <FormField label="Hausnummer">
                      <StyledInput value={form.street_number} onChange={set("street_number") as (v: string) => void} placeholder="42a" />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Postleitzahl">
                      <StyledInput value={form.zip} onChange={set("zip") as (v: string) => void} placeholder="40000" />
                    </FormField>
                    <FormField label="Stadt">
                      <StyledInput value={form.city} onChange={set("city") as (v: string) => void} placeholder="Duesseldorf" />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Land">
                      <NacSelect value={form.country} onChange={set("country") as (v: string) => void}>
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

                  <NextButton onClick={() => setActiveTab("tarif")} />
                </div>
              )}

              {/* ── TAB: TARIF & STATUS ──────────────────────────────────── */}
              {activeTab === "tarif" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <SectionTitle icon={Settings2}>Tarif & Vertrag</SectionTitle>

                  {/* Tarif-Karten */}
                  <div>
                    <label style={FIELD_LABEL}>
                      Tarif <span style={{ color: "var(--brand)" }}>*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {CONTRACT_OPTIONS.map((opt) => {
                        const active = form.contract_type === opt.value;
                        const Icon = opt.icon;
                        return (
                          <motion.button
                            key={opt.value}
                            type="button"
                            onClick={() => set("contract_type")(opt.value)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                              padding: "14px 10px",
                              border: active ? `1px solid ${opt.color}` : "1px solid rgba(255,255,255,0.08)",
                              background: active ? `${opt.color}14` : "rgba(255,255,255,0.02)",
                              cursor: "pointer", display: "flex", flexDirection: "column",
                              alignItems: "center", gap: "7px",
                              boxShadow: active ? `0 0 18px ${opt.color}25` : "none",
                              transition: "all 0.18s",
                            }}
                          >
                            <Icon size={18} style={{ color: active ? opt.color : "rgba(255,255,255,0.3)" }} />
                            <span style={{
                              fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                              letterSpacing: "0.12em", textTransform: "uppercase",
                              color: active ? "white" : "rgba(255,255,255,0.4)",
                            }}>
                              {opt.label}
                            </span>
                            <span style={{
                              fontFamily: "var(--font-display)", fontSize: "18px",
                              color: active ? opt.color : "rgba(255,255,255,0.25)", lineHeight: 1,
                            }}>
                              {opt.price}<span style={{ fontSize: "10px" }}>€</span>
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%" }}>
                              {opt.features.map((f) => (
                                <span key={f} style={{
                                  fontFamily: "var(--font-body)", fontSize: "10px",
                                  color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                                  textAlign: "center",
                                }}>
                                  {f}
                                </span>
                              ))}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormField label="Vertragsstart" required>
                        <StyledInput type="date" value={form.member_since}
                          onChange={set("member_since") as (v: string) => void}
                          style={{ colorScheme: "dark", ...(errors.member_since ? { borderColor: "rgba(248,113,113,0.6)" } : {}) }} />
                      </FormField>
                      {errors.member_since && <ErrorHint>{errors.member_since}</ErrorHint>}
                    </div>
                    <FormField label="NAC Mitgliedsstatus">
                      <NacSelect value={form.status} onChange={set("status") as (v: string) => void}>
                        <option value="active">Aktiv</option>
                        <option value="frozen">Eingefroren</option>
                        <option value="terminated">Gekuendigt</option>
                      </NacSelect>
                    </FormField>
                  </div>

                  <FormField label="Magicline Kundenstatus (optional)">
                    <NacSelect value={form.magicline_customer_status} onChange={set("magicline_customer_status") as (v: string) => void}>
                      <option value="">– Nicht gesetzt –</option>
                      <option value="PROSPECT">Prospect</option>
                      <option value="MEMBER">Member</option>
                      <option value="FORMER_MEMBER">Former Member</option>
                      <option value="TERMINATED">Terminated</option>
                    </NacSelect>
                  </FormField>

                  <NextButton onClick={() => setActiveTab("optionen")} />
                </div>
              )}

              {/* ── TAB: OPTIONEN & NOTIZEN ──────────────────────────────── */}
              {activeTab === "optionen" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <SectionTitle icon={StickyNote}>Optionen & Notizen</SectionTitle>

                  {/* Login-Checkbox */}
                  <label style={{
                    display: "flex", alignItems: "flex-start", gap: "14px",
                    padding: "16px",
                    background: form.create_login ? "rgba(202,12,133,0.07)" : "rgba(255,255,255,0.02)",
                    border: form.create_login ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.07)",
                    cursor: "pointer", transition: "all 0.18s",
                  }}>
                    <input
                      type="checkbox"
                      checked={form.create_login}
                      onChange={(e) => set("create_login")(e.target.checked)}
                      style={{
                        width: "16px", height: "16px", marginTop: "3px",
                        accentColor: "var(--brand)", flexShrink: 0, cursor: "pointer",
                      }}
                    />
                    <div>
                      <p style={{
                        fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase", color: "white",
                      }}>
                        Login-Account erstellen
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                        Das Mitglied erhaelt Zugang zur Member-App. Initiales Passwort:{" "}
                        <span style={{ color: "rgba(202,12,133,0.85)", fontFamily: "monospace" }}>Start123!</span>
                      </p>
                      {form.create_login && form.email && (
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>
                          Login-E-Mail: <span style={{ color: "rgba(255,255,255,0.6)" }}>{form.email}</span>
                        </p>
                      )}
                    </div>
                  </label>

                  {/* Interne Notizen */}
                  <div>
                    <label style={FIELD_LABEL}>Interne Admin-Notizen (optional)</label>
                    <textarea
                      rows={8}
                      value={form.notes}
                      onChange={(e) => set("notes")(e.target.value)}
                      placeholder="Freitextnotiz – z. B. Absprachen, Hinweise, Besonderheiten..."
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
                    {form.notes.length > 0 && (
                      <p style={{
                        fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em",
                        color: "rgba(255,255,255,0.2)", textAlign: "right", marginTop: "4px",
                      }}>
                        {form.notes.length} Zeichen
                      </p>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "14px 24px", background: "#0b0b0b", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          {/* Pflichtfeld-Hinweis */}
          {Object.keys(errors).length > 0 ? (
            <span style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontFamily: "var(--font-condensed)", fontSize: "10px",
              letterSpacing: "0.1em", textTransform: "uppercase", color: "#f87171",
            }}>
              <AlertCircle size={12} /> Bitte Pflichtfelder ausfuellen
            </span>
          ) : (
            <p style={{
              fontFamily: "var(--font-condensed)", fontSize: "10px",
              letterSpacing: "0.12em", color: "rgba(255,255,255,0.18)", textTransform: "uppercase",
            }}>
              <span style={{ color: "var(--brand)" }}>*</span> Pflichtfelder
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button" onClick={onClose} disabled={saving}
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-condensed)",
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", padding: "9px 18px", cursor: "pointer",
                transition: "all 0.18s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
            >
              Abbrechen
            </button>
            <button
              type="button" onClick={handleSave} disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: "7px", minHeight: "40px",
                padding: "9px 22px",
                background: saving ? "rgba(202,12,133,0.6)" : "var(--brand)",
                border: "none", color: "white", cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                boxShadow: saving ? "none" : "0 0 20px rgba(202,12,133,0.35)",
                transition: "all 0.2s", opacity: saving ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(202,12,133,0.55)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.35)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }
              }}
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Wird angelegt...</>
                : <><PlusCircle size={14} /> Mitglied Anlegen</>
              }
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Kleine Hilfskomponenten ────────────────────────────────────────────────────
function ErrorHint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--font-body)", fontSize: "11px", color: "#f87171",
      marginTop: "4px", display: "flex", alignItems: "center", gap: "4px",
    }}>
      <AlertCircle size={10} /> {children}
    </p>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
      <button
        type="button" onClick={onClick}
        style={{
          background: "none", border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-condensed)",
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", padding: "8px 16px", cursor: "pointer",
          transition: "all 0.18s", display: "flex", alignItems: "center", gap: "6px",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)"; e.currentTarget.style.color = "rgba(202,12,133,0.8)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
      >
        Naechster Schritt <ChevronDown size={11} style={{ transform: "rotate(-90deg)" }} />
      </button>
    </div>
  );
}

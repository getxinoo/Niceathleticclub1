/**
 * AdminSettings.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Globale Einstellungen – inkl. GoBD-konformer Rechnungsparameter.
 * Lädt beim Mounten die aktuellen Werte vom Backend und speichert per PATCH.
 *
 * Feldstruktur (seit Refactor):
 *   Adresse     → company_street / company_zip / company_city (Einzelfelder)
 *   Register    → company_court  / company_hrb                (Einzelfelder)
 *   Bank        → bank_iban / bank_bic / bank_name            (Einzelfelder)
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Building2,
  FileText,
  Server,
  Loader2,
  Save,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { api } from "@/lib/api-service";
import { toast } from "sonner";
import { useSettings } from "../../context/SettingsContext";

// ── Stil-Hilfsfunktionen ──────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  fontFamily: "var(--font-body)",
  fontSize: "14px",
  padding: "10px 12px",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

function focusOn(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.6)";
}
function blurOn(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
}

// ── Hilfs-UI: Label ───────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: "var(--font-condensed)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
        marginBottom: "6px",
      }}
    >
      {children}
    </label>
  );
}

// ── Hilfs-UI: Einzel-Textfeld ────────────────────────────────────────────────
function Field({
  label,
  fieldKey,
  value,
  placeholder,
  hint,
  disabled,
  onChange,
  type = "text",
}: {
  label: string;
  fieldKey: string;
  value: string;
  placeholder?: string;
  hint?: string;
  disabled: boolean;
  onChange: (key: string, val: string) => void;
  type?: "text" | "email" | "url";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        onFocus={focusOn}
        onBlur={blurOn}
        style={{ ...inputBase, opacity: disabled ? 0.6 : 1 }}
      />
      {hint && (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "11px",
            color: "rgba(255,255,255,0.3)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Hilfs-UI: Select ──────────────────────────────────────────────────────────
function SelectField({
  label,
  fieldKey,
  value,
  options,
  hint,
  disabled,
  onChange,
}: {
  label: string;
  fieldKey: string;
  value: string;
  options: { value: string; label: string }[];
  hint?: string;
  disabled: boolean;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          onFocus={focusOn}
          onBlur={blurOn}
          style={{
            ...inputBase,
            appearance: "none",
            paddingRight: "36px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "rgba(255,255,255,0.4)",
          }}
        />
      </div>
      {hint && (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "11px",
            color: "rgba(255,255,255,0.3)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Hilfs-UI: Gruppen-Überschrift innerhalb einer Sektion ─────────────────────
function SubHeading({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        paddingBottom: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "16px",
      }}
    >
      <Icon size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
      <span
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Hilfs-UI: Sektion ─────────────────────────────────────────────────────────
function SettingsSection({
  icon: Icon,
  title,
  delay,
  children,
}: {
  icon: React.ElementType;
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: "rgba(202,12,133,0.1)",
            border: "1px solid rgba(202,12,133,0.2)",
          }}
        >
          <Icon size={14} style={{ color: "var(--brand)" }} />
        </div>
        <h3
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "white",
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { refresh: refreshSettings } = useSettings();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.settings.get();
      setValues(data);
    } catch {
      // Toast via api-service
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.admin.settings.update(values);
      setSaved(true);
      // Context neu laden → Footer, Impressum, AGB, Datenschutz, Kontakt
      // reflektieren die Änderungen sofort ohne Page-Reload
      await refreshSettings();
      toast.success("Einstellungen gespeichert", {
        description: "Alle Änderungen wurden erfolgreich übernommen.",
      });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Toast via api-service
    } finally {
      setSaving(false);
    }
  };

  const v = (key: string, fallback = "") => values[key] ?? fallback;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            EINSTELL<span style={{ color: "var(--brand)" }}>UNGEN</span>
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "rgba(255,255,255,0.3)",
              marginTop: "4px",
            }}
          >
            Globale Konfiguration · GoBD-konforme Rechnungsparameter
          </p>
        </div>
        <button
          onClick={loadSettings}
          disabled={loading}
          title="Neu laden"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
            fontFamily: "var(--font-condensed)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </motion.div>

      {/* ── Lade-Overlay ── */}
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "24px 0",
          }}
        >
          <Loader2
            size={18}
            className="animate-spin"
            style={{ color: "var(--brand)" }}
          />
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Einstellungen werden geladen…
          </span>
        </div>
      )}

      {!loading && (
        <>
          {/* ── Sektion: Firma & Absender ── */}
          <SettingsSection icon={Building2} title="Firma & Absender" delay={0.05}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Firmenname */}
              <Field
                label="Firmenname"
                fieldKey="company_name"
                value={v("company_name")}
                placeholder="MK Fitness & Strength GmbH"
                hint="Erscheint als Absender auf jeder Rechnung."
                disabled={saving}
                onChange={handleChange}
              />

              {/* Adresse: Straße */}
              <Field
                label="Straße & Hausnummer"
                fieldKey="company_street"
                value={v("company_street")}
                placeholder="Robert-Bosch-Str. 5"
                disabled={saving}
                onChange={handleChange}
              />

              {/* Adresse: PLZ + Ort nebeneinander */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr",
                  gap: "12px",
                }}
              >
                <Field
                  label="PLZ"
                  fieldKey="company_zip"
                  value={v("company_zip")}
                  placeholder="73037"
                  disabled={saving}
                  onChange={handleChange}
                />
                <Field
                  label="Ort"
                  fieldKey="company_city"
                  value={v("company_city")}
                  placeholder="Göppingen"
                  disabled={saving}
                  onChange={handleChange}
                />
              </div>

              {/* E-Mail */}
              <Field
                label="E-Mail für Rechnungen"
                fieldKey="company_email"
                value={v("company_email")}
                placeholder="info@nice-fitness.de"
                type="email"
                disabled={saving}
                onChange={handleChange}
              />

              {/* USt-IdNr. */}
              <Field
                label="USt-IdNr."
                fieldKey="vat_id"
                value={v("vat_id")}
                placeholder="DE123456789"
                hint="Umsatzsteuer-Identifikationsnummer gem. § 27a UStG."
                disabled={saving}
                onChange={handleChange}
              />

              {/* Registergericht */}
              <Field
                label="Registergericht"
                fieldKey="company_court"
                value={v("company_court")}
                placeholder="Amtsgericht Ulm"
                disabled={saving}
                onChange={handleChange}
              />

              {/* HRB-Nummer */}
              <Field
                label="HRB-Nummer"
                fieldKey="company_hrb"
                value={v("company_hrb")}
                placeholder="HRB 737370"
                disabled={saving}
                onChange={handleChange}
              />

              {/* Geschäftsführer */}
              <Field
                label="Geschäftsführer"
                fieldKey="ceo"
                value={v("ceo")}
                placeholder="Wilhelm Walter"
                disabled={saving}
                onChange={handleChange}
              />

              {/* ── Bankverbindung Subsektion ── */}
              <div style={{ paddingTop: "4px" }}>
                <SubHeading icon={CreditCard} label="Bankverbindung" />
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <Field
                    label="IBAN"
                    fieldKey="bank_iban"
                    value={v("bank_iban")}
                    placeholder="DE89 3704 0044 0532 0130 00"
                    disabled={saving}
                    onChange={handleChange}
                  />
                  <Field
                    label="BIC"
                    fieldKey="bank_bic"
                    value={v("bank_bic")}
                    placeholder="COBADEFFXXX"
                    disabled={saving}
                    onChange={handleChange}
                  />
                  <Field
                    label="Bank"
                    fieldKey="bank_name"
                    value={v("bank_name")}
                    placeholder="Commerzbank AG"
                    hint="Wird im Rechnungs-Footer und im Zahlungshinweis angezeigt."
                    disabled={saving}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Logo URL */}
              <Field
                label="Logo URL"
                fieldKey="logo_url"
                value={v("logo_url")}
                placeholder="https://example.com/logo.png"
                type="url"
                hint="Optional. Falls angegeben, wird das Logo oben auf jeder Rechnung gedruckt."
                disabled={saving}
                onChange={handleChange}
              />
            </div>
          </SettingsSection>

          {/* ── Sektion: Rechnungswesen ── */}
          <SettingsSection
            icon={FileText}
            title="GoBD-Rechnungsparameter"
            delay={0.12}
          >
            {/* Info-Box */}
            <div
              style={{
                background: "rgba(202,12,133,0.06)",
                border: "1px solid rgba(202,12,133,0.15)",
                padding: "12px 14px",
                marginBottom: "18px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <FileText
                size={14}
                style={{ color: "var(--brand)", flexShrink: 0, marginTop: "1px" }}
              />
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Diese Werte werden beim{" "}
                <strong style={{ color: "rgba(255,255,255,0.75)" }}>
                  Erstellen einer neuen Rechnung
                </strong>{" "}
                als unveränderlicher Snapshot eingefroren (GoBD § 239 HGB).
                Bestehende Rechnungen sind von Änderungen <em>nicht</em>{" "}
                betroffen.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
              }}
            >
              <Field
                label="Nummernkreis-Format"
                fieldKey="invoice_number_format"
                value={v("invoice_number_format")}
                placeholder="RE-ymd-###"
                hint="Platzhalter: Y=2025, y=25, m=07, d=15, ###=laufende Tagesnummer."
                disabled={saving}
                onChange={handleChange}
              />
              <Field
                label="Storno-Suffix"
                fieldKey="storno_suffix"
                value={v("storno_suffix", "-STO")}
                placeholder="-STO"
                hint="Wird an die Rechnungsnummer angehängt bei Stornierung."
                disabled={saving}
                onChange={handleChange}
              />
              <SelectField
                label="MwSt-Satz"
                fieldKey="vat_rate"
                value={v("vat_rate", "19")}
                options={[
                  { value: "19", label: "19 % (Regelsteuersatz)" },
                  { value: "7", label: "7 % (ermäßigt)" },
                  { value: "0", label: "0 % (steuerbefreit)" },
                ]}
                hint="Wird auf neuen Rechnungen als Snapshot eingefroren."
                disabled={saving}
                onChange={handleChange}
              />
            </div>
          </SettingsSection>

          {/* ── Sektion: API-Info ── */}
          <SettingsSection icon={Server} title="API Konfiguration" delay={0.2}>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              API Base URL:{" "}
              <code
                style={{
                  color: "var(--brand)",
                  background: "rgba(202,12,133,0.08)",
                  padding: "1px 6px",
                }}
              >
                https://nicefitness.de/api
              </code>
              <br />
              Konfigurierbar via{" "}
              <code
                style={{
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "1px 6px",
                }}
              >
                VITE_API_BASE_URL
              </code>{" "}
              in der{" "}
              <code
                style={{
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "1px 6px",
                }}
              >
                .env
              </code>
              -Datei.
            </p>
          </SettingsSection>

          {/* ── Speichern-Button ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingBottom: "24px",
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 28px",
                minHeight: "48px",
                background: saved ? "rgba(34,197,94,0.85)" : "var(--brand)",
                border: "none",
                color: "white",
                fontFamily: "var(--font-condensed)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "background 0.2s, box-shadow 0.2s, transform 0.1s",
                boxShadow: saved
                  ? "0 0 20px rgba(34,197,94,0.3)"
                  : "0 0 20px rgba(202,12,133,0.25)",
              }}
              onMouseEnter={(e) => {
                if (!saving)
                  e.currentTarget.style.background = saved
                    ? "rgba(34,197,94,0.95)"
                    : "var(--brand-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = saved
                  ? "rgba(34,197,94,0.85)"
                  : "var(--brand)";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Wird
                  gespeichert…
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={15} /> Gespeichert
                </>
              ) : (
                <>
                  <Save size={15} /> Einstellungen speichern
                </>
              )}
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}
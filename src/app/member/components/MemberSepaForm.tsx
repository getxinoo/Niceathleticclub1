/**
 * MemberSepaForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Member-seitiger SEPA Self-Service (Mobile-First).
 *
 * Features:
 *  • Zeigt aktuelles SEPA-Mandat (maskierte IBAN, Status, BIC, Ref.)
 *  • Button "Bankverbindung ändern" öffnet ein Inline-Formular
 *  • SEPA-Autorisierungstext mit Checkbox
 *  • Saves via Mock (TODO: api.member.sepa.update)
 *
 * Verwendung in MemberVertrag.tsx oder MemberProfil.tsx:
 *  import MemberSepaForm from "@/app/member/components/MemberSepaForm";
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard, Landmark, CheckCircle2, AlertCircle,
  Pencil, X, Loader2, Save, Lock, Clock,
} from "lucide-react";
import { toast } from "sonner";

// ── Typen ─────────────────────────────────────────────────────────────────────
interface SepaMandat {
  ibanMasked: string;
  bic: string;
  mandateRef: string;
  status: "active" | "pending" | "none";
  signedAt?: string;
}

// ── Mock aktuelles Mandat (wird von der API geliefert) ────────────────────────
const MOCK_MANDAT: SepaMandat = {
  ibanMasked: "DE87 **** **** **** 1234",
  bic: "COBADEFFXXX",
  mandateRef: "NAC-00042-SEPA",
  status: "active",
  signedAt: "2024-02-03",
};

// ── Status-Config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:  { label: "SEPA Aktiv",     color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)",   icon: CheckCircle2 },
  pending: { label: "Ausstehend",     color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",   icon: Clock },
  none:    { label: "Kein Mandat",    color: "#9ca3af", bg: "rgba(156,163,175,0.06)", border: "rgba(156,163,175,0.18)", icon: AlertCircle },
};

// ── Shared Styles ─────────────────────────────────────────────────────────────
const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.38)",
  textTransform: "uppercase",
  marginBottom: "5px",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "white",
  fontSize: "14px",
  padding: "12px 14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  fontFamily: "monospace",
  letterSpacing: "0.04em",
};

const READONLY_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  fontFamily: "monospace",
  fontSize: "13px",
  letterSpacing: "0.05em",
  color: "rgba(255,255,255,0.45)",
};

// ── SEPA-Autorisierungstext ───────────────────────────────────────────────────
const SEPA_AUTH_TEXT =
  'Ich ermächtige den NICE Athletic Club, Zahlungen von meinem Konto mittels SEPA-Lastschrift einzuziehen. ' +
  'Zugleich weise ich mein Kreditinstitut an, die vom NICE Athletic Club gezogenen Lastschriften einzulösen. ' +
  'Hinweis: Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten ' +
  'Betrages verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen.';

// ── IBAN-Formatierung ─────────────────────────────────────────────────────────
function formatIban(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Haupt-Komponente ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function MemberSepaForm() {
  // In echtem Betrieb: const { data: mandat } = useQuery("sepa", api.member.sepa.get)
  const [mandat, setMandat]     = useState<SepaMandat>(MOCK_MANDAT);
  const [editing, setEditing]   = useState(false);

  // Formular-State
  const [iban, setIban]         = useState("");
  const [bic, setBic]           = useState("");
  const [agreed, setAgreed]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [ibanError, setIbanError] = useState("");
  const [bicError, setBicError]   = useState("");

  const cfg = STATUS_CFG[mandat.status];
  const StatusIcon = cfg.icon;

  // ── IBAN-Validierung (Basisprüfung Länge + Prefix) ───────────────────────
  const validateIban = (val: string): boolean => {
    const clean = val.replace(/\s/g, "");
    if (clean.length < 15) { setIbanError("IBAN ist zu kurz (mind. 15 Zeichen)"); return false; }
    if (!/^[A-Z]{2}\d{2}/.test(clean)) { setIbanError("IBAN muss mit Ländercode beginnen (z.B. DE87…)"); return false; }
    setIbanError("");
    return true;
  };

  const validateBic = (val: string): boolean => {
    if (val.trim().length < 8) { setBicError("BIC/SWIFT ist zu kurz (mind. 8 Zeichen)"); return false; }
    setBicError("");
    return true;
  };

  // ── Speichern ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const ibanOk = validateIban(iban);
    const bicOk  = validateBic(bic);
    if (!ibanOk || !bicOk) return;
    if (!agreed) {
      toast.error("Bitte bestätige das SEPA-Lastschriftmandat.");
      return;
    }

    setSaving(true);
    await new Promise((r) => setTimeout(r, 900)); // TODO: await api.member.sepa.update({ iban, bic })

    const ibanClean = iban.replace(/\s/g, "");
    const masked    = `${ibanClean.slice(0, 4)} **** **** **** ${ibanClean.slice(-4)}`;

    setMandat({
      ibanMasked: masked,
      bic: bic.toUpperCase(),
      mandateRef: `NAC-${String(Date.now()).slice(-5)}-SEPA`,
      status: "pending",
      signedAt: new Date().toISOString().split("T")[0],
    });

    toast.success("Bankverbindung aktualisiert", {
      description: "Dein neues SEPA-Mandat wird in Kürze aktiviert.",
    });

    setEditing(false);
    setIban("");
    setBic("");
    setAgreed(false);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setIban("");
    setBic("");
    setAgreed(false);
    setIbanError("");
    setBicError("");
  };

  return (
    <div style={{ maxWidth: "520px", width: "100%" }}>

      {/* ── Aktuelles Mandat Card ─────────────────────────────────────────── */}
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}>
        {/* Card Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Landmark size={16} style={{ color: "var(--brand)" }} />
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "white", textTransform: "uppercase" }}>
                SEPA-Lastschrift
              </p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>
                Deine Bankverbindung
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "5px 12px",
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.1em", color: cfg.color, textTransform: "uppercase",
          }}>
            <StatusIcon size={11} />
            {cfg.label}
          </span>
        </div>

        {/* Mandat-Details */}
        <div style={{ padding: "16px 20px" }}>
          {mandat.status !== "none" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* IBAN */}
              <div>
                <label style={LABEL_STYLE}>IBAN</label>
                <div style={READONLY_STYLE}>
                  <Lock size={12} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                  <span>{mandat.ibanMasked}</span>
                </div>
              </div>

              {/* BIC + Mandat-Ref nebeneinander */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={LABEL_STYLE}>BIC / SWIFT</label>
                  <div style={READONLY_STYLE}>{mandat.bic}</div>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Mandatsreferenz</label>
                  <div style={{ ...READONLY_STYLE, fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.06em" }}>
                    {mandat.mandateRef}
                  </div>
                </div>
              </div>

              {/* Erteilt am */}
              {mandat.signedAt && (
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)", marginTop: "2px" }}>
                  Mandat erteilt am {new Date(mandat.signedAt).toLocaleDateString("de-DE")}
                </p>
              )}
            </div>
          ) : (
            /* Kein Mandat */
            <div style={{ padding: "24px", textAlign: "center" }}>
              <CreditCard size={28} style={{ color: "rgba(255,255,255,0.1)", marginBottom: "8px" }} />
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
                Noch keine Bankverbindung hinterlegt.
              </p>
            </div>
          )}

          {/* ── CTA Button ─────────────────────────────────────────────── */}
          {!editing && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditing(true)}
              style={{
                width: "100%", marginTop: "16px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.65)", padding: "12px",
                fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(202,12,133,0.35)";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.background = "rgba(202,12,133,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
            >
              <Pencil size={13} />
              Bankverbindung ändern
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Bearbeitungs-Formular (Inline) ────────────────────────────────── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            key="sepa-form"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(202,12,133,0.2)",
              borderTop: "2px solid var(--brand)",
            }}>
              {/* Form Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Landmark size={14} style={{ color: "var(--brand)" }} />
                  <span style={{
                    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                    letterSpacing: "0.18em", color: "white", textTransform: "uppercase",
                  }}>
                    Neue Bankverbindung
                  </span>
                </div>
                <button
                  onClick={handleCancel}
                  style={{
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.35)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "4px",
                    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 8px",
                  }}
                >
                  <X size={12} /> Abbrechen
                </button>
              </div>

              <div style={{ padding: "20px" }}>

                {/* ── IBAN Input ─────────────────────────────────────────── */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={LABEL_STYLE}>Neue IBAN *</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => {
                      setIban(formatIban(e.target.value));
                      if (ibanError) validateIban(e.target.value);
                    }}
                    onBlur={(e) => validateIban(e.target.value)}
                    placeholder="DE87 **** **** **** 1234"
                    maxLength={32}
                    style={{
                      ...INPUT_STYLE,
                      borderColor: ibanError ? "rgba(248,113,113,0.5)" : undefined,
                    }}
                    onFocus={(e)  => { if (!ibanError) e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
                    onBlurCapture={(e) => { if (!ibanError) e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                  {ibanError ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                      <AlertCircle size={11} style={{ color: "#f87171", flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "#f87171" }}>{ibanError}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)", marginTop: "4px" }}>
                      Wird verschlüsselt und maskiert gespeichert
                    </p>
                  )}
                </div>

                {/* ── BIC Input ──────────────────────────────────────────── */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={LABEL_STYLE}>BIC / SWIFT *</label>
                  <input
                    type="text"
                    value={bic}
                    onChange={(e) => {
                      setBic(e.target.value.toUpperCase().replace(/\s/g, ""));
                      if (bicError) validateBic(e.target.value);
                    }}
                    onBlur={(e) => validateBic(e.target.value)}
                    placeholder="COBADEFFXXX"
                    maxLength={11}
                    style={{
                      ...INPUT_STYLE,
                      borderColor: bicError ? "rgba(248,113,113,0.5)" : undefined,
                    }}
                    onFocus={(e)  => { if (!bicError) e.currentTarget.style.borderColor = "rgba(202,12,133,0.55)"; }}
                    onBlurCapture={(e) => { if (!bicError) e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  />
                  {bicError && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                      <AlertCircle size={11} style={{ color: "#f87171", flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "#f87171" }}>{bicError}</span>
                    </div>
                  )}
                </div>

                {/* ── SEPA-Autorisierungs-Checkbox ───────────────────────── */}
                <div
                  role="checkbox"
                  aria-checked={agreed}
                  tabIndex={0}
                  onClick={() => setAgreed(!agreed)}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAgreed(!agreed); } }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    padding: "14px 16px", marginBottom: "20px",
                    background: agreed ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${agreed ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer", transition: "all 0.15s",
                    outline: "none",
                  }}
                >
                  {/* Checkbox Box */}
                  <div style={{
                    width: "20px", height: "20px", flexShrink: 0, marginTop: "1px",
                    border: `2px solid ${agreed ? "#4ade80" : "rgba(255,255,255,0.25)"}`,
                    background: agreed ? "rgba(74,222,128,0.15)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {agreed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <CheckCircle2 size={13} style={{ color: "#4ade80" }} />
                      </motion.div>
                    )}
                  </div>

                  {/* Mandatstext */}
                  <p style={{
                    fontSize: "12px", lineHeight: 1.65,
                    color: agreed ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.4)",
                    transition: "color 0.15s",
                  }}>
                    {SEPA_AUTH_TEXT}
                  </p>
                </div>

                {/* Hinweis */}
                <div style={{
                  display: "flex", gap: "8px", padding: "10px 14px",
                  background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)",
                  marginBottom: "20px",
                }}>
                  <AlertCircle size={13} style={{ color: "#fbbf24", flexShrink: 0, marginTop: "1px" }} />
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                    Nach dem Speichern wird dein neues Mandat zunächst als{" "}
                    <strong style={{ color: "#fbbf24" }}>Ausstehend</strong> angezeigt und vom Team bestätigt.
                    Die nächste Abbuchung erfolgt dann von der neuen IBAN.
                  </p>
                </div>

                {/* ── Submit Button ───────────────────────────────────────── */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)",
                    border: "none", color: "white", padding: "14px",
                    fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    cursor: saving ? "not-allowed" : "pointer", transition: "all 0.15s",
                    boxShadow: saving ? "none" : "0 0 20px rgba(202,12,133,0.25)",
                  }}
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Wird gespeichert…</>
                  ) : (
                    <><Save size={14} /> Neues Mandat kostenpflichtig speichern</>
                  )}
                </motion.button>

                <p style={{
                  textAlign: "center", fontSize: "10px",
                  color: "rgba(255,255,255,0.2)", marginTop: "10px", lineHeight: 1.5,
                }}>
                  🔒 Daten werden SSL-verschlüsselt übertragen · DSGVO-konform
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

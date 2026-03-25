/**
 * ForcePasswordChange – Erst-Login Passwort-Änderungspflicht
 * Blockiert den Zugang zum Dashboard bis ein sicheres eigenes Passwort gesetzt wird.
 *
 * Passwort-Policy:
 *  - Min. 10 Zeichen
 *  - Gross- & Kleinbuchstaben
 *  - Mindestens 1 Zahl
 *  - Mindestens 1 Sonderzeichen
 *  - Keine Namensbestandteile (Anti-Social-Engineering)
 */
import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Lock, Eye, EyeOff, CheckCircle2, XCircle, Shield, AlertTriangle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";

interface Props {
  userName: string;
  onPasswordChanged: () => void;
}

interface Rule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export default function ForcePasswordChange({ userName, onPasswordChanged }: Props) {
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  // Extract first/last name for anti-social-engineering check
  const nameParts = userName.split(" ").filter(Boolean);
  const firstName = (nameParts[0] ?? "").toLowerCase();
  const lastName = (nameParts[nameParts.length - 1] ?? "").toLowerCase();

  const rules: Rule[] = useMemo(() => [
    { key: "length", label: "Mindestens 10 Zeichen", test: (p) => p.length >= 10 },
    { key: "upper", label: "Mindestens 1 Grossbuchstabe", test: (p) => /[A-Z]/.test(p) },
    { key: "lower", label: "Mindestens 1 Kleinbuchstabe", test: (p) => /[a-z]/.test(p) },
    { key: "digit", label: "Mindestens 1 Zahl", test: (p) => /\d/.test(p) },
    { key: "special", label: "Mindestens 1 Sonderzeichen (!@#$%...)", test: (p) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(p) },
    {
      key: "noname",
      label: "Keine Namensbestandteile",
      test: (p) => {
        const lower = p.toLowerCase();
        if (firstName.length >= 3 && lower.includes(firstName)) return false;
        if (lastName.length >= 3 && lower.includes(lastName)) return false;
        return true;
      },
    },
  ], [firstName, lastName]);

  const ruleResults = useMemo(() => rules.map(r => ({
    ...r,
    passed: r.test(pw),
  })), [pw, rules]);

  const allPassed = ruleResults.every(r => r.passed);
  const passwordsMatch = pw === pwConfirm && pw.length > 0;
  const canSubmit = allPassed && passwordsMatch;

  // Strength indicator
  const strength = useMemo(() => {
    const passedCount = ruleResults.filter(r => r.passed).length;
    if (passedCount <= 2) return { label: "Schwach", color: "#EF4444", width: "25%" };
    if (passedCount <= 4) return { label: "Mittel", color: "#F59E0B", width: "50%" };
    if (passedCount <= 5) return { label: "Gut", color: "#60A5FA", width: "75%" };
    return { label: "Stark", color: "#22C55E", width: "100%" };
  }, [ruleResults]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.auth.changePassword(pw);
      toast.success("Passwort erfolgreich geändert!", {
        description: "Du kannst jetzt das Dashboard nutzen.",
      });
      onPasswordChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Passwort-Änderung fehlgeschlagen.";
      toast.error("Fehler", { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#050505" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(245,158,11,0.03)" }}>
          <div className="w-16 h-16 mx-auto flex items-center justify-center mb-4" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Shield size={28} style={{ color: "#F59E0B" }} />
          </div>
          <h2 className="text-white mb-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>
            PASSWORT ÄNDERN
          </h2>
          <p className="text-white/40 text-sm">
            Willkommen, {userName}! Bitte setze ein sicheres eigenes Passwort.
          </p>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-5 p-3 flex items-start gap-2" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <p className="text-xs" style={{ color: "rgba(245,158,11,0.7)", lineHeight: 1.6 }}>
            Aus Sicherheitsgründen musst du dein temporäres Initial-Passwort bei der ersten Anmeldung ändern. Ohne Änderung ist kein Zugriff auf das Dashboard möglich.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* New Password */}
          <div>
            <label className="block mb-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}>
              NEUES PASSWORT
            </label>
            <div className="relative">
              <Lock size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }} />
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Sicheres Passwort eingeben..."
                className="w-full pl-9 pr-10 py-3 text-sm text-white"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${pw && !allPassed ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`, outline: "none" }}
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)" }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Strength Bar */}
          {pw.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)" }}>PASSWORTSTÄRKE</span>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: strength.color }}>{strength.label}</span>
              </div>
              <div style={{ height: "3px", background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: strength.width }}
                  transition={{ duration: 0.3 }}
                  style={{ height: "100%", background: strength.color }}
                />
              </div>
            </div>
          )}

          {/* Rules */}
          {pw.length > 0 && (
            <div className="space-y-1.5">
              {ruleResults.map(r => (
                <div key={r.key} className="flex items-center gap-2">
                  {r.passed
                    ? <CheckCircle2 size={12} style={{ color: "#22C55E" }} />
                    : <XCircle size={12} style={{ color: "rgba(255,255,255,0.15)" }} />}
                  <span style={{ fontSize: "11px", color: r.passed ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.3)" }}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="block mb-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}>
              PASSWORT BESTÄTIGEN
            </label>
            <input
              type={showPw ? "text" : "password"}
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              placeholder="Passwort wiederholen..."
              className="w-full px-3 py-3 text-sm text-white"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${pwConfirm && !passwordsMatch ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                outline: "none",
              }}
            />
            {pwConfirm && !passwordsMatch && (
              <p className="text-xs mt-1" style={{ color: "#EF4444" }}>Passwörter stimmen nicht überein.</p>
            )}
          </div>

          {/* Submit */}
          <motion.button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            whileHover={canSubmit && !saving ? { y: -1, boxShadow: "0 0 20px rgba(34,197,94,0.3)" } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className="w-full flex items-center justify-center gap-2 py-3 mt-2 cursor-pointer"
            style={{
              background: canSubmit ? "#22C55E" : "rgba(255,255,255,0.06)",
              border: "none",
              color: canSubmit ? "white" : "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-condensed)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              cursor: canSubmit && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> WIRD GESPEICHERT…</> : <><Lock size={14} /> PASSWORT SETZEN & WEITER</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
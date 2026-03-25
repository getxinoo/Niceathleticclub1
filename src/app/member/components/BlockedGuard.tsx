/**
 * BlockedGuard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sprint 9 – Account-Sperre & Kündigungslogik
 *
 * Prüft user.is_blocked aus AuthContext.
 * Bei true: rendert ein Full-Screen Overlay mit Sperr-Card.
 * Der reguläre Member-Bereich wird dadurch vollständig überlagert (z-50+).
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldOff,
  Mail,
  LogOut,
  FileX2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api, Member } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { toast } from "sonner";

// ── Kündigungs-Modal ──────────────────────────────────────────────────────────
function TerminationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await api.member.requestTermination(reason.trim());
      setSuccess(true);
    } catch {
      // Toast already shown by api-service
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        style={{
          background:    "#0c0c0c",
          borderColor:   "rgba(255,255,255,0.08)",
          maxWidth:      "460px",
          zIndex:        300,
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileX2 size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle
              style={{
                fontFamily:    "var(--font-display)",
                fontSize:      "22px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color:         "white",
              }}
            >
              Kündigung anfragen
            </DialogTitle>
          </div>
          <DialogDescription style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)", fontSize: "13px" }}>
            Deine Anfrage wird manuell geprüft. Du erhältst eine Bestätigungs-E-Mail vom NAC-Team.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <CheckCircle2 size={48} style={{ color: "#4ade80" }} />
              <div className="text-center">
                <p
                  style={{
                    fontFamily:    "var(--font-condensed)",
                    fontSize:      "18px",
                    fontWeight:    700,
                    letterSpacing: "0.06em",
                    color:         "white",
                    textTransform: "uppercase",
                  }}
                >
                  Anfrage eingegangen
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", fontFamily: "var(--font-body)", marginTop: "8px" }}>
                  Deine Kündigung wird geprüft. Du erhältst eine E-Mail mit der Bestätigung.
                </p>
              </div>
              <Button onClick={handleClose} variant="outline" style={{ marginTop: "8px" }}>
                Schließen
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}
            >
              <div>
                <label
                  style={{
                    display:       "block",
                    fontFamily:    "var(--font-condensed)",
                    fontSize:      "10px",
                    fontWeight:    700,
                    letterSpacing: "0.18em",
                    color:         "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    marginBottom:  "6px",
                  }}
                >
                  Kündigungsgrund *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Bitte beschreibe kurz den Grund für deine Kündigung…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width:        "100%",
                    background:   "rgba(255,255,255,0.04)",
                    border:       "1px solid rgba(255,255,255,0.1)",
                    color:        "white",
                    fontFamily:   "var(--font-body)",
                    fontSize:     "13px",
                    padding:      "10px 12px",
                    outline:      "none",
                    resize:       "vertical",
                    boxSizing:    "border-box",
                    transition:   "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
              </div>
              <DialogFooter style={{ gap: "8px" }}>
                <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={saving || !reason.trim()}>
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Wird gesendet…</>
                    : <><FileX2 size={14} /> ANFRAGE SENDEN</>}
                </Button>
              </DialogFooter>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export function BlockedGuard() {
  const { user, logout }          = useAuth();
  const [profile, setProfile]     = useState<Member | null>(null);
  const [terminateOpen, setTerm]  = useState(false);

  // Profildetails laden (für block_reason + block_message)
  useEffect(() => {
    if (!user?.is_blocked) return;
    api.member.profile.get().then(setProfile).catch(() => {});
  }, [user?.is_blocked]);

  // Nicht gesperrt → kein Overlay
  if (!user?.is_blocked) return null;

  const blockReason  = profile?.block_reason  ?? "Konto gesperrt";
  const blockMessage = profile?.block_message;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          200,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          padding:         "24px",
          backdropFilter:  "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          background:      "rgba(5,5,5,0.92)",
        }}
      >
        {/* Animierter Magenta-Glow-Hintergrund */}
        <motion.div
          animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          style={{
            position:     "absolute",
            top:          "50%",
            left:         "50%",
            transform:    "translate(-50%, -50%)",
            width:        "min(600px, 90vw)",
            height:       "min(600px, 90vw)",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(202,12,133,0.35) 0%, transparent 70%)",
            pointerEvents:"none",
          }}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position:       "relative",
            width:          "100%",
            maxWidth:       "480px",
            background:     "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px)",
            border:         "1px solid rgba(255,255,255,0.08)",
            borderTop:      "1px solid rgba(202,12,133,0.3)",
            padding:        "36px 32px",
            display:        "flex",
            flexDirection:  "column",
            gap:            "24px",
          }}
        >
          {/* Icon + Titel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
            <div
              style={{
                width:          "64px",
                height:         "64px",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                background:     "rgba(202,12,133,0.12)",
                border:         "1px solid rgba(202,12,133,0.3)",
              }}
            >
              <ShieldOff size={28} style={{ color: "var(--brand)" }} />
            </div>

            <div>
              <p
                style={{
                  fontFamily:    "var(--font-display)",
                  fontSize:      "clamp(1.6rem, 5vw, 2.2rem)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color:         "white",
                  lineHeight:    1,
                }}
              >
                ACCOUNT <span style={{ color: "var(--brand)" }}>GESPERRT</span>
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize:   "14px",
                  color:      "rgba(255,255,255,0.4)",
                  marginTop:  "8px",
                }}
              >
                Dein Zugang wurde temporär deaktiviert.
              </p>
            </div>
          </div>

          {/* Sperrgrund */}
          <div
            style={{
              background:   "rgba(202,12,133,0.07)",
              border:       "1px solid rgba(202,12,133,0.2)",
              padding:      "14px 16px",
              display:      "flex",
              alignItems:   "flex-start",
              gap:          "10px",
            }}
          >
            <AlertTriangle size={16} style={{ color: "var(--brand)", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p
                style={{
                  fontFamily:    "var(--font-condensed)",
                  fontSize:      "10px",
                  fontWeight:    700,
                  letterSpacing: "0.18em",
                  color:         "rgba(202,12,133,0.8)",
                  textTransform: "uppercase",
                  marginBottom:  "4px",
                }}
              >
                Sperrgrund
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "white" }}>
                {blockReason}
              </p>
              {blockMessage && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "6px" }}>
                  {blockMessage}
                </p>
              )}
            </div>
          </div>

          {/* Aktionen */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={() => setTerm(true)}
              style={{
                width:          "100%",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            "8px",
                padding:        "14px 16px",
                background:     "rgba(255,255,255,0.04)",
                border:         "1px solid rgba(255,255,255,0.12)",
                color:          "white",
                fontFamily:     "var(--font-condensed)",
                fontSize:       "12px",
                fontWeight:     700,
                letterSpacing:  "0.14em",
                textTransform:  "uppercase",
                cursor:         "pointer",
                transition:     "all 0.2s",
                minHeight:      "48px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "rgba(202,12,133,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              <FileX2 size={15} /> Vertrag kündigen
            </button>

            <a
              href="mailto:support@niceathleticclub.de"
              style={{
                width:          "100%",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            "8px",
                padding:        "14px 16px",
                background:     "transparent",
                border:         "1px solid rgba(255,255,255,0.07)",
                color:          "rgba(255,255,255,0.45)",
                fontFamily:     "var(--font-condensed)",
                fontSize:       "12px",
                fontWeight:     700,
                letterSpacing:  "0.14em",
                textTransform:  "uppercase",
                textDecoration: "none",
                cursor:         "pointer",
                transition:     "color 0.2s",
                minHeight:      "48px",
                boxSizing:      "border-box",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
            >
              <Mail size={14} /> Support kontaktieren
            </a>
          </div>

          {/* Abmelden */}
          <div style={{ textAlign: "center", paddingTop: "4px" }}>
            <button
              onClick={logout}
              style={{
                background:    "none",
                border:        "none",
                color:         "rgba(255,255,255,0.2)",
                fontFamily:    "var(--font-body)",
                fontSize:      "12px",
                cursor:        "pointer",
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "6px",
                transition:    "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
            >
              <LogOut size={12} /> Abmelden
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Kündigungs-Modal */}
      <TerminationModal open={terminateOpen} onClose={() => setTerm(false)} />
    </>
  );
}
/**
 * AdminBewerber.tsx – Bewerber-Zentrum mit Smart-Transition Lifecycle
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *  - Filterable applicant list with status pills & one-click status change
 *  - "+ Bewerber manuell anlegen" modal for walk-ins
 *  - "Einstellen" opens Smart Onboarding Modal (data check, role, permissions)
 *  - On onboarding → applicant archived, staff account created
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, X, Loader2, Mail, Phone, Calendar, User,
  ChevronDown, Trash2, CheckCircle2, Clock, Eye,
  MapPin, Briefcase, UserPlus, Filter, ArrowUpDown,
  Shield, ShieldCheck, ChevronRight, Sparkles,
  AlertTriangle, UserCheck, Settings, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Applicant {
  id: number; jobId: number | null; firstName: string; lastName: string;
  email: string; phone?: string; status: string; createdAt: string;
  source?: string; coverLetter?: string; notes?: string;
  birthDate?: string; city?: string; profession?: string;
}

interface Job {
  id: number; title: string; department: string;
}

type StaffRole = "admin" | "hr" | "finance" | "trainer" | "frontdesk";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUSES = [
  { key: "neu",            label: "NEU",           color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
  { key: "gesichtet",      label: "SCREENING",     color: "#A855F7", bg: "rgba(168,85,247,0.08)" },
  { key: "telefonat",      label: "GESPRÄCH",      color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { key: "probetraining",  label: "ANGEBOT",       color: "#CA0C85", bg: "rgba(202,12,133,0.08)" },
  { key: "eingestellt",    label: "EINGESTELLT",   color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
  { key: "abgelehnt",      label: "ABGELEHNT",     color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
];

const ROLE_OPTIONS: { value: StaffRole; label: string; color: string }[] = [
  { value: "trainer",   label: "Trainer",   color: "#60A5FA" },
  { value: "frontdesk", label: "Service / Empfang", color: "#FBBF24" },
  { value: "hr",        label: "HR-Admin",  color: "#A78BFA" },
  { value: "finance",   label: "Finance",   color: "#34D399" },
  { value: "admin",     label: "Admin",     color: "#CA0C85" },
];

const PERMISSIONS = [
  { value: "Kurse verwalten",       label: "Kurse & Kursplan bearbeiten",      icon: "🏋️" },
  { value: "Mitglieder verwalten",  label: "Mitglieder einsehen & verwalten",  icon: "👥" },
  { value: "Finanzen einsehen",     label: "Finanzen & Rechnungen einsehen",   icon: "💶" },
  { value: "Antraege bearbeiten",   label: "Pausen- & Kündigungsanträge",      icon: "📬" },
  { value: "Dienstplan bearbeiten", label: "Dienstplan bearbeiten",            icon: "📅" },
  { value: "Kasse bedienen",        label: "Kasse & Theke bedienen",           icon: "🧾" },
  { value: "System-Settings",       label: "Systemeinstellungen ändern",       icon: "⚙️" },
];

const EMPTY_APPLICANT = {
  firstName: "", lastName: "", email: "", phone: "", city: "",
  profession: "", source: "Walk-in", coverLetter: "", jobId: null as number | null,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusPill({ status, onChange, compact }: {
  status: string; onChange?: (s: string) => void; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const s = STATUSES.find(st => st.key === status) ?? STATUSES[0];

  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1" style={{
        background: s.bg, border: `1px solid ${s.color}30`, fontFamily: "var(--font-condensed)",
        fontSize: compact ? "9px" : "10px", fontWeight: 700, letterSpacing: "0.12em", color: s.color,
      }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
        {s.label}
      </span>
    );
  }

  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 cursor-pointer transition-all hover:brightness-110"
        style={{
          background: s.bg, border: `1px solid ${s.color}30`, fontFamily: "var(--font-condensed)",
          fontSize: compact ? "9px" : "10px", fontWeight: 700, letterSpacing: "0.12em", color: s.color,
        }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
        {s.label}
        <ChevronDown size={10} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 z-50 py-1"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", minWidth: "160px", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}
            >
              {STATUSES.map(opt => (
                <button key={opt.key}
                  onClick={(e) => { e.stopPropagation(); onChange(opt.key); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ border: "none", background: "none" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: status === opt.key ? opt.color : "rgba(255,255,255,0.5)" }}>
                    {opt.label}
                  </span>
                  {status === opt.key && <CheckCircle2 size={10} className="ml-auto" style={{ color: opt.color }} />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Onboarding Modal ──────────────────────────────────────────────────────────

function OnboardingModal({ applicant, jobs, onClose, onComplete }: {
  applicant: Applicant; jobs: Job[];
  onClose: () => void;
  onComplete: (applicantId: number, role: StaffRole, permissions: string[], mode: "auto" | "manual") => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<"auto" | "manual" | "">("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Generated company email
  const generateEmail = (first: string, last: string) => {
    const map: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss", é: "e", è: "e" };
    const clean = (s: string) => s.toLowerCase().split("").map(c => map[c] ?? c).join("").replace(/[^a-z]/g, "");
    return `${clean(first)}.${clean(last)}@nice-fitness.de`;
  };

  const [companyEmail, setCompanyEmail] = useState(generateEmail(applicant.firstName, applicant.lastName));
  const [emailSuffix, setEmailSuffix] = useState(1);

  const handleEmailBump = () => {
    const base = generateEmail(applicant.firstName, applicant.lastName);
    const next = emailSuffix + 1;
    setEmailSuffix(next);
    setCompanyEmail(base.replace("@nice-fitness.de", `${next}@nice-fitness.de`));
  };

  const jobTitle = applicant.jobId
    ? jobs.find(j => j.id === applicant.jobId)?.title ?? `Job #${applicant.jobId}`
    : "Initiativbewerbung";

  const togglePerm = (p: string) =>
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleComplete = async () => {
    if (mode === "auto" && !role) { toast.error("Bitte Rolle auswählen."); return; }
    setSubmitting(true);
    try {
      await onComplete(applicant.id, role as StaffRole, permissions, mode as "auto" | "manual");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg overflow-hidden"
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(34,197,94,0.03)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <Sparkles size={18} style={{ color: "#22C55E" }} />
            </div>
            <div>
              <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>SMART ONBOARDING</h3>
              <p className="text-white/30 text-xs">Bewerber → Mitarbeiter Transition</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white cursor-pointer p-2" style={{ background: "none", border: "none" }}>
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {[
            { n: 1, label: "Entscheidung" },
            { n: 2, label: "Daten-Check" },
            { n: 3, label: "Rolle & Rechte" },
            { n: 4, label: "Abschluss" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px" style={{ background: step >= s.n ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.06)" }} />}
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 flex items-center justify-center text-[9px]"
                  style={{
                    fontFamily: "var(--font-condensed)", fontWeight: 700,
                    background: step >= s.n ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${step >= s.n ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                    color: step >= s.n ? "#22C55E" : "rgba(255,255,255,0.2)",
                  }}>
                  {step > s.n ? <CheckCircle2 size={10} /> : s.n}
                </span>
                <span style={{
                  fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                  letterSpacing: "0.1em", color: step >= s.n ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                }}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Entscheidung ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 mx-auto flex items-center justify-center mb-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <UserCheck size={24} style={{ color: "#22C55E" }} />
                  </div>
                  <h4 className="text-white text-lg mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    BEWERBER ALS MITARBEITER ÜBERNEHMEN?
                  </h4>
                  <p className="text-white/35 text-xs">
                    {applicant.firstName} {applicant.lastName} · {applicant.email}
                  </p>
                </div>

                <div className="space-y-3 mb-5">
                  {/* Option A: Auto */}
                  <button onClick={() => { setMode("auto"); setStep(2); }}
                    className="w-full flex items-start gap-4 p-4 text-left cursor-pointer transition-all hover:bg-white/[0.02]"
                    style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                      <Sparkles size={16} style={{ color: "#22C55E" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm mb-1" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em" }}>
                        JA, ACCOUNT AUTOMATISCH ERSTELLEN
                      </p>
                      <p className="text-white/40 text-xs leading-relaxed">
                        System erstellt Firmen-E-Mail, generiert sicheres Initial-Passwort und sendet Zugangsdaten per Mail. Der Mitarbeiter muss beim ersten Login sein Passwort ändern.
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-white/20 shrink-0 mt-3" />
                  </button>

                  {/* Option B: Manual */}
                  <button onClick={() => { setMode("manual"); setStep(4); }}
                    className="w-full flex items-start gap-4 p-4 text-left cursor-pointer transition-all hover:bg-white/[0.02]"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Clock size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/70 text-sm mb-1" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em" }}>
                        NUR STATUS ÄNDERN (MANUELLE ANLAGE SPÄTER)
                      </p>
                      <p className="text-white/30 text-xs leading-relaxed">
                        Setzt den Bewerber-Status auf „Eingestellt". Der Account kann später über Team & Rechte manuell angelegt werden.
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-white/10 shrink-0 mt-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Daten-Check + E-Mail-Vorschau ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <p className="text-white/40 text-xs mb-4" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em" }}>ÜBERNOMMENE BEWERBERDATEN</p>

                <div className="space-y-3 mb-4">
                  {[
                    { icon: User, label: "Name", value: `${applicant.firstName} ${applicant.lastName}` },
                    { icon: Mail, label: "Private E-Mail", value: applicant.email },
                    { icon: Phone, label: "Telefon", value: applicant.phone || "—" },
                    { icon: MapPin, label: "Stadt", value: applicant.city || "—" },
                    { icon: Briefcase, label: "Bewerbung für", value: jobTitle },
                    { icon: Calendar, label: "Eingegangen", value: new Date(applicant.createdAt).toLocaleDateString("de-DE") },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <row.icon size={13} className="text-white/20 shrink-0" />
                      <span className="text-white/30 text-xs w-24 shrink-0" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em" }}>{row.label}</span>
                      <span className="text-white/80 text-sm flex-1">{row.value}</span>
                      <CheckCircle2 size={12} style={{ color: "rgba(34,197,94,0.4)" }} />
                    </div>
                  ))}
                </div>

                {/* ── E-Mail-Vorschau ── */}
                <div className="p-4 mb-4" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <p className="text-white/40 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em" }}>
                    <Mail size={10} style={{ display: "inline", marginRight: "4px" }} />
                    GENERIERTE FIRMEN-E-MAIL
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "monospace", fontSize: "13px", color: "#60A5FA", letterSpacing: "0.03em" }}>
                      {companyEmail}
                    </div>
                    <button onClick={handleEmailBump} title="Duplikat? Alternative generieren"
                      className="px-3 py-2 cursor-pointer transition-all hover:bg-white/5"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: "10px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                      +1
                    </button>
                  </div>
                  <p className="text-white/25 text-[10px] mt-2">
                    Bereits vergeben? Klicke +1 für eine Variante (z.B. vorname.nachname2@...)
                  </p>
                </div>

                {/* Security Info */}
                <div className="p-3 mb-4" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)" }}>
                  <div className="flex items-start gap-2">
                    <Lock size={13} className="mt-0.5 shrink-0" style={{ color: "#22C55E" }} />
                    <p className="text-xs" style={{ color: "rgba(34,197,94,0.7)" }}>
                      Ein sicheres 16-stelliges Initial-Passwort wird generiert. Der Mitarbeiter <strong className="text-white/70">muss</strong> beim ersten Login ein eigenes Passwort setzen (min. 10 Zeichen, keine Namensbestandteile).
                    </p>
                  </div>
                </div>

                <div className="flex justify-between mt-5">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2 text-white/40 border-white/10">ZURÜCK</Button>
                  <Button onClick={() => setStep(3)} className="gap-2" style={{ background: "#22C55E" }}>
                    WEITER: ROLLE ZUWEISEN <ChevronRight size={14} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Rolle & Rechte ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em" }}>
                  ROLLE ZUWEISEN <span style={{ color: "#CA0C85" }}>*</span>
                </p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => setRole(r.value)}
                      className="flex items-center gap-2.5 px-3 py-3 text-left cursor-pointer transition-all"
                      style={{
                        background: role === r.value ? `${r.color}12` : "rgba(255,255,255,0.02)",
                        border: role === r.value ? `1px solid ${r.color}50` : "1px solid rgba(255,255,255,0.06)",
                      }}>
                      <Shield size={14} style={{ color: role === r.value ? r.color : "rgba(255,255,255,0.15)" }} />
                      <span style={{
                        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                        letterSpacing: "0.1em", color: role === r.value ? r.color : "rgba(255,255,255,0.4)",
                      }}>
                        {r.label}
                      </span>
                      {role === r.value && <CheckCircle2 size={12} className="ml-auto" style={{ color: r.color }} />}
                    </button>
                  ))}
                </div>

                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em" }}>BERECHTIGUNGEN</p>
                <div className="space-y-1.5 mb-5">
                  {PERMISSIONS.map(p => (
                    <button key={p.value} onClick={() => togglePerm(p.value)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-all hover:bg-white/[0.02]"
                      style={{
                        background: permissions.includes(p.value) ? "rgba(202,12,133,0.04)" : "transparent",
                        border: permissions.includes(p.value) ? "1px solid rgba(202,12,133,0.15)" : "1px solid rgba(255,255,255,0.04)",
                      }}>
                      <div className="w-5 h-5 flex items-center justify-center shrink-0"
                        style={{
                          background: permissions.includes(p.value) ? "rgba(202,12,133,0.2)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${permissions.includes(p.value) ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`,
                        }}>
                        {permissions.includes(p.value) && <CheckCircle2 size={10} style={{ color: "#CA0C85" }} />}
                      </div>
                      <span className="text-sm">{p.icon}</span>
                      <span className="text-white/70 text-xs flex-1">{p.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between mt-5">
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2 text-white/40 border-white/10">ZURÜCK</Button>
                  <Button onClick={() => { if (!role) { toast.error("Bitte Rolle auswählen."); return; } setStep(4); }}
                    className="gap-2" style={{ background: "#22C55E" }}>
                    WEITER: BESTÄTIGEN <ChevronRight size={14} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Bestätigung ── */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto flex items-center justify-center mb-4" style={{ background: mode === "auto" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${mode === "auto" ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)"}` }}>
                    {mode === "auto" ? <UserCheck size={28} style={{ color: "#22C55E" }} /> : <Clock size={28} style={{ color: "rgba(255,255,255,0.3)" }} />}
                  </div>
                  <h4 className="text-white text-lg mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {mode === "auto" ? "ONBOARDING BESTÄTIGEN" : "STATUS ÄNDERN"}
                  </h4>
                  <p className="text-white/35 text-xs">
                    {mode === "auto" ? "Folgende Aktionen werden ausgeführt:" : "Nur Status-Änderung ohne Account-Erstellung:"}
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  {(mode === "auto" ? (
                    [
                      { icon: UserPlus, text: `Mitarbeiter-Account für ${applicant.firstName} ${applicant.lastName} erstellen`, color: "#22C55E" },
                      { icon: Mail, text: `Firmen-E-Mail: ${companyEmail}`, color: "#60A5FA" },
                      { icon: Shield, text: `Rolle: ${ROLE_OPTIONS.find(r => r.value === role)?.label ?? role}`, color: ROLE_OPTIONS.find(r => r.value === role)?.color ?? "#fff" },
                      { icon: Lock, text: `${permissions.length} Berechtigungen zugewiesen`, color: "#CA0C85" },
                      { icon: Lock, text: "Sicheres Initial-Passwort wird generiert (Änderungspflicht)", color: "#F59E0B" },
                      { icon: Eye, text: "Bewerber-Datensatz wird archiviert (Status → Eingestellt)", color: "#A855F7" },
                      { icon: Mail, text: `Login-Zugangsdaten an ${applicant.email} senden`, color: "#3B82F6" },
                    ]
                  ) : (
                    [
                      { icon: Eye, text: `Status von ${applicant.firstName} ${applicant.lastName} auf "Eingestellt" setzen`, color: "#22C55E" },
                      { icon: Clock, text: "Kein Account wird erstellt – manuelle Anlage über Team & Rechte möglich", color: "#F59E0B" },
                    ]
                  )).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <item.icon size={14} style={{ color: item.color }} />
                      <span className="text-white/60 text-xs flex-1">{item.text}</span>
                      <CheckCircle2 size={11} style={{ color: "rgba(34,197,94,0.3)" }} />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(mode === "auto" ? 3 : 1)} className="gap-2 text-white/40 border-white/10">ZURÜCK</Button>
                  <Button onClick={handleComplete} disabled={submitting}
                    className="gap-2 px-6" style={{ background: "#22C55E", fontSize: "13px" }}>
                    {submitting ? <><Loader2 size={14} className="animate-spin" /> WIRD ERSTELLT…</> : <><Sparkles size={14} /> {mode === "auto" ? "ONBOARDING ABSCHLIESSEN" : "STATUS ÄNDERN"}</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Create Applicant Modal ────────────────────────────────────────────────────

function CreateApplicantModal({ jobs, onClose, onCreate }: {
  jobs: Job[]; onClose: () => void;
  onCreate: (data: typeof EMPTY_APPLICANT) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_APPLICANT });
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form, v: string | number | null) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email) { toast.error("Name und E-Mail sind Pflichtfelder."); return; }
    setSubmitting(true);
    try { await onCreate(form); } finally { setSubmitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md overflow-hidden"
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.25)" }}>
              <UserPlus size={16} style={{ color: "#CA0C85" }} />
            </div>
            <div>
              <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>BEWERBER ANLEGEN</h3>
              <p className="text-white/25 text-[10px]">Walk-in oder Empfehlung manuell erfassen</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white cursor-pointer p-2" style={{ background: "none", border: "none" }}><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ModalInput label="Vorname *" value={form.firstName} onChange={v => update("firstName", v)} placeholder="Lukas" />
            <ModalInput label="Nachname *" value={form.lastName} onChange={v => update("lastName", v)} placeholder="Fit" />
          </div>
          <ModalInput label="E-Mail *" value={form.email} onChange={v => update("email", v)} placeholder="lukas@example.com" type="email" />
          <div className="grid grid-cols-2 gap-3">
            <ModalInput label="Telefon" value={form.phone} onChange={v => update("phone", v)} placeholder="+49 176 ..." />
            <ModalInput label="Stadt" value={form.city} onChange={v => update("city", v)} placeholder="Göppingen" />
          </div>
          <ModalInput label="Beruf" value={form.profession} onChange={v => update("profession", v)} placeholder="Personal Trainer" />

          {/* Job Select */}
          <div>
            <label className="block mb-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}>BEWERBUNG FÜR</label>
            <select value={form.jobId ?? ""} onChange={e => update("jobId", e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }}>
              <option value="" className="bg-[#0a0a0a]">Initiativbewerbung</option>
              {jobs.map(j => <option key={j.id} value={j.id} className="bg-[#0a0a0a]">{j.title}</option>)}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block mb-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}>QUELLE</label>
            <div className="flex flex-wrap gap-2">
              {["Walk-in", "Empfehlung", "Website", "Instagram", "Indeed"].map(src => (
                <button key={src} onClick={() => update("source", src)}
                  className="px-3 py-1.5 text-xs cursor-pointer transition-all"
                  style={{
                    fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em",
                    background: form.source === src ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.02)",
                    border: form.source === src ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    color: form.source === src ? "#CA0C85" : "rgba(255,255,255,0.35)",
                  }}>
                  {src}
                </button>
              ))}
            </div>
          </div>

          <ModalTextarea label="Notizen / Anschreiben" value={form.coverLetter} onChange={v => update("coverLetter", v)} placeholder="Optionale Notizen..." />
        </div>

        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <Button variant="outline" onClick={onClose} className="text-white/40 border-white/10">ABBRECHEN</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2" style={{ background: "#CA0C85" }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            BEWERBER ERSTELLEN
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalInput({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}>{label}</label>
      <input type={type ?? "text"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm text-white"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
    </div>
  );
}

function ModalTextarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)" }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full px-3 py-2.5 text-sm text-white resize-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminBewerber() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [onboardingTarget, setOnboardingTarget] = useState<Applicant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.karriere.getAll();
      setApplicants(data.applicants ?? []);
      setJobs(data.jobs ?? []);
    } catch { toast.error("Fehler beim Laden."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [location.key, load]);

  // ── Filters & Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...applicants];
    if (filterStatus !== "all") result = result.filter(a => a.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a => `${a.firstName} ${a.lastName} ${a.email} ${a.profession ?? ""}`.toLowerCase().includes(q));
    }
    result.sort((a, b) => sortBy === "date"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
    return result;
  }, [applicants, filterStatus, search, sortBy]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: applicants.length,
    neu: applicants.filter(a => a.status === "neu").length,
    inPipeline: applicants.filter(a => ["gesichtet", "telefonat", "probetraining"].includes(a.status)).length,
    eingestellt: applicants.filter(a => a.status === "eingestellt").length,
  }), [applicants]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const updateStatus = async (id: number, status: string) => {
    // If setting to "eingestellt", trigger onboarding modal instead
    if (status === "eingestellt") {
      const target = applicants.find(a => a.id === id);
      if (target) {
        setOnboardingTarget(target);
        return;
      }
    }
    try {
      await api.admin.karriere.updateApplicant(id, { status });
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
      toast.success(`Status aktualisiert.`);
    } catch { toast.error("Fehler."); }
  };

  const deleteApplicant = async (id: number) => {
    if (!confirm("Bewerber wirklich löschen?")) return;
    try {
      await api.admin.karriere.deleteApplicant(id);
      setApplicants(prev => prev.filter(a => a.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Bewerber gelöscht.");
    } catch { toast.error("Fehler."); }
  };

  const handleCreate = async (data: typeof EMPTY_APPLICANT) => {
    try {
      // In real app: POST to API. For now simulate locally.
      const newApplicant: Applicant = {
        id: Date.now(),
        jobId: data.jobId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        city: data.city || undefined,
        profession: data.profession || undefined,
        source: data.source || undefined,
        coverLetter: data.coverLetter || undefined,
        status: "neu",
        createdAt: new Date().toISOString(),
      };
      setApplicants(prev => [newApplicant, ...prev]);
      setShowCreate(false);
      toast.success(`${data.firstName} ${data.lastName} als Bewerber erfasst.`);
    } catch { toast.error("Fehler beim Anlegen."); }
  };

  const handleOnboardComplete = async (applicantId: number, role: StaffRole, permissions: string[], mode: "auto" | "manual") => {
    const applicant = applicants.find(a => a.id === applicantId);
    if (!applicant) return;

    try {
      if (mode === "manual") {
        // Manual mode: Only update status
        await api.admin.karriere.updateApplicant(applicantId, { status: "eingestellt" });
        setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: "eingestellt" } : a));
        setOnboardingTarget(null);
        setSelected(null);
        toast.success(
          `${applicant.firstName} ${applicant.lastName} als "Eingestellt" markiert.`,
          { description: "Account kann über Team & Rechte manuell angelegt werden.", duration: 5000 }
        );
        return;
      }

      // Auto mode: Create staff account
      const result = await api.admin.users.createStaff({
        first_name: applicant.firstName,
        last_name: applicant.lastName,
        email: applicant.email,
        phone: applicant.phone ?? "",
        birth_date: applicant.birthDate ?? null,
        role,
        permissions,
        active: true,
        must_change_pw: true,
        source: "onboarding",
        applicant_id: applicantId,
      });

      // Also update applicant status
      try {
        await api.admin.karriere.updateApplicant(applicantId, { status: "eingestellt" });
      } catch {
        // API already handled this in create
      }

      setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: "eingestellt" } : a));
      setOnboardingTarget(null);
      setSelected(null);

      const roleName = ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
      const staffNumber = (result as any)?.staff_number ?? "";
      const companyEmail = (result as any)?.company_email ?? "";

      toast.success(
        `${applicant.firstName} ${applicant.lastName} wurde als ${roleName} eingestellt!`,
        {
          description: `${staffNumber ? `MA-Nr: ${staffNumber}` : ""}${companyEmail ? ` · ${companyEmail}` : ""} · Passwort-Änderung beim Erst-Login erforderlich.`,
          duration: 8000,
        }
      );
    } catch (err) {
      console.error("Onboarding error:", err);
      toast.error("Fehler beim Onboarding. Bitte pruefen Sie die Konsole fuer Details.");
    }
  };

  const getJobTitle = (jobId: number | null) => {
    if (!jobId) return "Initiativbewerbung";
    return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
            BEWERBER-ZENTRUM
          </h1>
          <p className="text-white/30 text-sm mt-1">Smart-Transition Lifecycle · Eingang → Screening → Onboarding</p>
        </div>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileHover={{ y: -1, boxShadow: "0 0 20px rgba(202,12,133,0.4)" }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 cursor-pointer"
          style={{
            background: "#CA0C85", border: "none", color: "white", minHeight: "44px",
            fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em",
          }}>
          <UserPlus size={15} /> BEWERBER ANLEGEN
        </motion.button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "GESAMT", value: stats.total, color: "rgba(255,255,255,0.5)" },
          { label: "NEU", value: stats.neu, color: "#3B82F6" },
          { label: "IN PIPELINE", value: stats.inPipeline, color: "#CA0C85" },
          { label: "EINGESTELLT", value: stats.eingestellt, color: "#22C55E" },
        ].map(s => (
          <div key={s.label} className="px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.25)" }}>{s.label}</span>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: s.value > 0 ? s.color : "rgba(255,255,255,0.1)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, E-Mail oder Beruf suchen..."
            className="w-full pl-9 pr-4 py-2.5 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", outline: "none" }} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterStatus("all")}
            className="px-3 py-2 text-xs cursor-pointer transition-all"
            style={{
              fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
              background: filterStatus === "all" ? "rgba(255,255,255,0.06)" : "transparent",
              border: filterStatus === "all" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.04)",
              color: filterStatus === "all" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
            }}>
            ALLE
          </button>
          {STATUSES.filter(s => s.key !== "eingestellt" && s.key !== "abgelehnt").map(s => (
            <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "all" : s.key)}
              className="px-3 py-2 text-xs cursor-pointer transition-all"
              style={{
                fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
                background: filterStatus === s.key ? s.bg : "transparent",
                border: filterStatus === s.key ? `1px solid ${s.color}30` : "1px solid rgba(255,255,255,0.04)",
                color: filterStatus === s.key ? s.color : "rgba(255,255,255,0.25)",
              }}>
              {s.label}
            </button>
          ))}

          <button onClick={() => setSortBy(sortBy === "date" ? "name" : "date")}
            className="px-3 py-2 text-xs cursor-pointer flex items-center gap-1.5"
            style={{
              fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.08em",
              background: "transparent", border: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)",
            }}>
            <ArrowUpDown size={10} />
            {sortBy === "date" ? "DATUM" : "NAME"}
          </button>
        </div>
      </div>

      {/* ── Applicant Table ── */}
      <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Table Header */}
        <div className="hidden sm:grid items-center gap-3 px-4 py-2.5"
          style={{ gridTemplateColumns: "2fr 1.5fr 1fr 120px 100px 80px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["BEWERBER", "STELLE", "QUELLE", "STATUS", "DATUM", ""].map(h => (
            <span key={h} style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.2)" }}>{h}</span>
          ))}
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-white/15 text-sm">Keine Bewerber gefunden.</div>
        ) : (
          filtered.map((app, idx) => (
            <motion.div key={app.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="sm:grid items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-white/[0.02]"
              style={{
                gridTemplateColumns: "2fr 1.5fr 1fr 120px 100px 80px",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                opacity: app.status === "abgelehnt" || app.status === "eingestellt" ? 0.5 : 1,
              }}
              onClick={() => setSelected(app)}>

              {/* Name */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center shrink-0 text-white/60"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", fontFamily: "var(--font-display)", fontSize: "11px" }}>
                  {app.firstName[0]}{app.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{app.firstName} {app.lastName}</p>
                  <p className="text-white/25 text-xs truncate">{app.email}</p>
                </div>
              </div>

              {/* Job */}
              <div className="hidden sm:block">
                <span className="text-white/40 text-xs truncate block">{getJobTitle(app.jobId)}</span>
                {app.profession && <span className="text-white/20 text-[10px]">{app.profession}</span>}
              </div>

              {/* Source */}
              <div className="hidden sm:block">
                {app.source && (
                  <span className="text-[10px] px-2 py-0.5 text-white/30"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {app.source}
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="mt-2 sm:mt-0" onClick={e => e.stopPropagation()}>
                <StatusPill status={app.status} onChange={s => updateStatus(app.id, s)} compact />
              </div>

              {/* Date */}
              <span className="hidden sm:block text-white/20 text-xs">
                {new Date(app.createdAt).toLocaleDateString("de-DE")}
              </span>

              {/* Actions */}
              <div className="hidden sm:flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                {app.status !== "eingestellt" && app.status !== "abgelehnt" && (
                  <button onClick={() => setOnboardingTarget(app)} title="Einstellen"
                    className="w-8 h-8 flex items-center justify-center cursor-pointer transition-all hover:bg-[rgba(34,197,94,0.1)]"
                    style={{ background: "none", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <UserCheck size={13} style={{ color: "#22C55E" }} />
                  </button>
                )}
                <button onClick={() => deleteApplicant(app.id)} title="Löschen"
                  className="w-8 h-8 flex items-center justify-center cursor-pointer transition-all hover:bg-[rgba(239,68,68,0.1)]"
                  style={{ background: "none", border: "1px solid rgba(239,68,68,0.1)" }}>
                  <Trash2 size={13} style={{ color: "#EF4444" }} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <p className="mt-2 text-right text-white/15 text-[10px]" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.06em" }}>
        {filtered.length} von {applicants.length} Bewerbern
      </p>

      {/* ── Detail Sheet ── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-end"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelected(null)}>
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="h-full w-full max-w-md overflow-y-auto p-6"
              style={{ background: "#0a0a0a", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                  BEWERBER DETAILS
                </h3>
                <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Name & Avatar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 flex items-center justify-center text-white"
                  style={{ background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.3)", fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>
                  {selected.firstName[0]}{selected.lastName[0]}
                </div>
                <div>
                  <p className="text-white text-lg">{selected.firstName} {selected.lastName}</p>
                  <p className="text-white/35 text-sm">{getJobTitle(selected.jobId)}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-white/50"><Mail size={13} /> {selected.email}</div>
                {selected.phone && <div className="flex items-center gap-2 text-sm text-white/50"><Phone size={13} /> {selected.phone}</div>}
                {selected.city && <div className="flex items-center gap-2 text-sm text-white/50"><MapPin size={13} /> {selected.city}</div>}
                {selected.profession && <div className="flex items-center gap-2 text-sm text-white/50"><Briefcase size={13} /> {selected.profession}</div>}
                <div className="flex items-center gap-2 text-sm text-white/50"><Calendar size={13} /> {new Date(selected.createdAt).toLocaleDateString("de-DE")}</div>
                {selected.source && <div className="flex items-center gap-2 text-sm text-white/50"><Eye size={13} /> Quelle: {selected.source}</div>}
              </div>

              {/* Status Pipeline */}
              <div className="mb-6">
                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em" }}>STATUS PIPELINE</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button key={s.key} onClick={() => updateStatus(selected.id, s.key)}
                      className="px-3 py-2 text-[10px] transition-all cursor-pointer"
                      style={{
                        fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em",
                        background: selected.status === s.key ? s.bg : "rgba(255,255,255,0.02)",
                        border: selected.status === s.key ? `1px solid ${s.color}` : "1px solid rgba(255,255,255,0.06)",
                        color: selected.status === s.key ? s.color : "rgba(255,255,255,0.3)",
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Letter */}
              {selected.coverLetter && (
                <div className="mb-6">
                  <p className="text-white/40 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em" }}>ANSCHREIBEN</p>
                  <p className="text-white/55 text-sm leading-relaxed p-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {selected.coverLetter}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 mt-8">
                {selected.status !== "eingestellt" && (
                  <motion.button
                    whileHover={{ y: -1, boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setOnboardingTarget(selected); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 cursor-pointer"
                    style={{ background: "#22C55E", border: "none", color: "white", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    <Sparkles size={15} /> EINSTELLEN → ONBOARDING STARTEN
                  </motion.button>
                )}
                {selected.status === "eingestellt" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-4 py-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                      <CheckCircle2 size={15} style={{ color: "#22C55E" }} />
                      <span className="text-sm" style={{ color: "#22C55E" }}>Status: Eingestellt</span>
                    </div>
                    {/* Permanenter Button für späteres Onboarding */}
                    <motion.button
                      whileHover={{ y: -1, boxShadow: "0 0 15px rgba(59,130,246,0.3)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setOnboardingTarget(selected)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 cursor-pointer"
                      style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60A5FA", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em" }}>
                      <UserPlus size={13} /> MITARBEITER-ACCOUNT JETZT GENERIEREN
                    </motion.button>
                  </div>
                )}
                <button onClick={() => deleteApplicant(selected.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 cursor-pointer transition-all hover:bg-[rgba(239,68,68,0.08)]"
                  style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em" }}>
                  <Trash2 size={13} /> BEWERBER LÖSCHEN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <CreateApplicantModal jobs={jobs} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>

      {/* ── Onboarding Modal ── */}
      <AnimatePresence>
        {onboardingTarget && (
          <OnboardingModal
            applicant={onboardingTarget}
            jobs={jobs}
            onClose={() => setOnboardingTarget(null)}
            onComplete={handleOnboardComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
/**
 * AdminMembers.tsx
 * Mitgliederverwaltung (ERP)
 *
 * Features:
 *  - Desktop: DataTable mit Kebab-Dropdown-Menu pro Zeile
 *  - Mobile:  Card-Liste statt gequetschter Tabelle
 *  - Kebab-Aktionen: Profil, Check-In Code, Notizen, Sperren/Entsperren, Loeschen
 *  - Magicline Customer Status Badge (PROSPECT/MEMBER/FORMER)
 *  - Lead konvertieren (3-Step-Wizard), Mitglied direkt anlegen
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  Search, ShieldOff, ShieldCheck, UserPlus,
  Mail, Phone, ChevronDown, X, Loader2,
  Zap, Star, Crown, Check, ArrowRight, ArrowLeft,
  Activity, Target, Flame, Beef, Wheat, Droplets, Save,
  User as UserIcon, PlusCircle, Pencil, Trash2,
  MoreVertical, QrCode, StickyNote, Copy, CheckCheck,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, Member, Lead, ContractType, MemberStatus } from "@/lib/api-service";
import { DataTable } from "@/app/components/ui/DataTable";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/app/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  SheetFooter,
} from "@/app/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MemberProfileSheet } from "@/app/admin/components/MemberProfileSheet";
import { CreateMemberSheet } from "@/app/admin/components/CreateMemberSheet";

// ── Konstanten ────────────────────────────────────────────────────────────────
const BLOCK_PRESETS = [
  { value: "Ausstehende Zahlungen",   label: "Ausstehende Zahlungen"   },
  { value: "Verhaltensversto",        label: "Verhaltensverstos"       },
  { value: "Vertrag ausgelaufen",     label: "Vertrag ausgelaufen"     },
  { value: "Voruebergehende Sperrung",label: "Vorueb. Sperrung"        },
  { value: "custom",                  label: "Eigener Grund..."        },
] as const;

const STATUS_COLORS: Record<MemberStatus, { bg: string; text: string; dot: string }> = {
  active:     { bg: "rgba(34,197,94,0.1)",  text: "#4ade80", dot: "#4ade80" },
  frozen:     { bg: "rgba(59,130,246,0.1)", text: "#60a5fa", dot: "#60a5fa" },
  terminated: { bg: "rgba(239,68,68,0.1)",  text: "#f87171", dot: "#f87171" },
};
const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Aktiv", frozen: "Eingefroren", terminated: "Gekuendigt",
};

const CONTRACT_OPTIONS: {
  value: ContractType; label: string; price: string;
  icon: React.ElementType; color: string; features: string[];
}[] = [
  {
    value: "starter", label: "STARTER", price: "39", icon: Zap, color: "#60a5fa",
    features: ["Studio-Zugang", "2x Kurszone/Woche", "Online Check-In", "Umkleidekabinen"],
  },
  {
    value: "performance", label: "PERFORMANCE", price: "59", icon: Star, color: "#f59e0b",
    features: ["Alles aus Starter", "Unbegrenzte Kurse", "10% PT-Rabatt", "Gaeste-Ticket/Mo."],
  },
  {
    value: "elite", label: "ELITE", price: "89", icon: Crown, color: "var(--brand)",
    features: ["Alles aus Performance", "Priority Booking", "Ernaehrungsberatung", "Premium Locker"],
  },
];

const LABEL_STYLE = {
  fontFamily: "var(--font-condensed)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase" as const,
};

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function fireEliteConfetti() {
  const burst = (x: number) =>
    confetti({ particleCount: 90, spread: 70, origin: { x, y: 0.6 }, colors: ["#CA0C85", "#ffffff", "#ff69b4", "#ff006e"] });
  burst(0.3);
  setTimeout(() => burst(0.7), 160);
  setTimeout(() => burst(0.5), 300);
}

// ── Hilfs-UI ─────────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px",
      fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)",
      textTransform: "uppercase", marginBottom: "6px",
    }}>
      {children}
    </label>
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
          width: "100%", appearance: "none", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", color: "white",
          fontFamily: "var(--font-body)", fontSize: "14px", padding: "10px 36px 10px 12px",
          outline: "none", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1, transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        {children}
      </select>
      <ChevronDown size={14} style={{
        position: "absolute", right: "10px", top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.4)",
      }} />
    </div>
  );
}

// ── Status-Badges ─────────────────────────────────────────────────────────────
function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const s = STATUS_COLORS[status];
  if (!s) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "3px 10px", background: s.bg,
      fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.1em", color: s.text, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.dot }} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function BlockedBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
      letterSpacing: "0.12em", color: "var(--brand)", textTransform: "uppercase",
    }}>
      <ShieldOff size={10} /> GESPERRT
    </span>
  );
}

// ── Magicline Customer Status Badge ──────────────────────────────────────────
const ML_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PROSPECT:       { bg: "rgba(251,191,36,0.12)",   text: "#fbbf24", dot: "#fbbf24", label: "Prospect"   },
  MEMBER:         { bg: "rgba(34,197,94,0.1)",     text: "#4ade80", dot: "#4ade80", label: "Member"     },
  FORMER_MEMBER:  { bg: "rgba(100,116,139,0.14)",  text: "#94a3b8", dot: "#94a3b8", label: "Former"     },
  TERMINATED:     { bg: "rgba(100,116,139,0.14)",  text: "#94a3b8", dot: "#94a3b8", label: "Terminated" },
};
function MlStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const cfg = ML_STATUS_CONFIG[status.toUpperCase()] ?? {
    bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)", dot: "rgba(255,255,255,0.3)", label: status,
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "2px 8px", background: cfg.bg,
      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
      letterSpacing: "0.1em", color: cfg.text, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ── DIALOG: Account sperren ───────────────────────────────────────────────────
function BlockDialog({ member, onClose, onSuccess }: {
  member: Member | null; onClose: () => void; onSuccess: () => void;
}) {
  const [preset, setPreset]   = useState<string>(BLOCK_PRESETS[0].value);
  const [custom, setCustom]   = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving]   = useState(false);

  const isCustom    = preset === "custom";
  const finalReason = isCustom ? custom.trim() : preset;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !finalReason) return;
    setSaving(true);
    try {
      await api.admin.members.block(member.id, { reason: finalReason, message: message.trim() });
      toast.success(`${member.first_name} ${member.last_name} wurde gesperrt.`);
      onSuccess(); onClose();
    } catch { /* via api-service */ } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "460px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldOff size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Account sperren
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {member ? `${member.first_name} ${member.last_name} (${member.email})` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "4px" }}>
          <div>
            <FieldLabel>Sperrgrund</FieldLabel>
            <NacSelect value={preset} onChange={setPreset}>
              {BLOCK_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </NacSelect>
          </div>

          <AnimatePresence>
            {isCustom && (
              <motion.div key="custom" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                <FieldLabel>Eigener Sperrgrund *</FieldLabel>
                <Input required={isCustom} placeholder="z. B. Mehrfacher Verstoss gegen Hausordnung" value={custom} onChange={(e) => setCustom(e.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <FieldLabel>Nachricht ans Mitglied (optional)</FieldLabel>
            <textarea
              rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Diese Nachricht sieht das Mitglied im Sperr-Overlay..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
                padding: "10px 12px", outline: "none", resize: "vertical", boxSizing: "border-box", transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
          </div>

          <DialogFooter style={{ gap: "8px" }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
            <Button type="submit" disabled={saving || (isCustom && !custom.trim())} style={{ background: "rgba(239,68,68,0.85)", boxShadow: "0 0 16px rgba(239,68,68,0.25)" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Gesperrt...</> : <><ShieldOff size={14} /> SPERREN</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG: Check-In Code anzeigen ────────────────────────────────────────────
function CheckInCodeDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const code = member?.check_in_code ?? "–";

  const handleCopy = () => {
    if (!member?.check_in_code) return;
    navigator.clipboard.writeText(member.check_in_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "380px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <QrCode size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Check-In Code
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {member?.first_name} {member?.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            padding: "28px 32px", textAlign: "center", width: "100%",
          }}>
            <p style={{ fontFamily: "monospace", fontSize: "30px", letterSpacing: "0.22em", color: "white", lineHeight: 1 }}>
              {code}
            </p>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginTop: "10px" }}>
              NAC Check-In Identifikation
            </p>
          </div>
          {member?.check_in_code && (
            <button
              onClick={handleCopy}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 20px",
                background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.1)",
                color: copied ? "#4ade80" : "rgba(255,255,255,0.6)",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
              {copied ? "Kopiert!" : "Code kopieren"}
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Schliessen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG: Notizen bearbeiten ────────────────────────────────────────────────
function NotesDialog({ member, onClose, onSuccess }: {
  member: Member | null; onClose: () => void; onSuccess: () => void;
}) {
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setNotes(member?.notes ?? ""); }, [member]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    try {
      await api.admin.members.update(member.id, { notes: notes.trim() || null });
      toast.success("Notiz gespeichert.");
      onSuccess(); onClose();
    } catch { /* via api-service */ } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "480px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <StickyNote size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Notiz
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {member?.first_name} {member?.last_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "4px" }}>
          <textarea
            rows={5} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Interne Notiz (nur fuer Admins sichtbar)..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
              padding: "10px 12px", outline: "none", resize: "vertical", boxSizing: "border-box", transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          <DialogFooter style={{ gap: "8px" }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
            <Button type="submit" disabled={saving} style={{ gap: "6px" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Wizard-Varianten ──────────────────────────────────────────────────────────
const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } },
  exit:   (dir: number) => ({ x: dir > 0 ? -56 : 56, opacity: 0, transition: { duration: 0.2 } }),
};

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{
            width:      i === step ? "24px" : "6px",
            background: i === step ? "var(--brand)" : i < step ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.15)",
          }}
          transition={{ duration: 0.25 }}
          style={{ height: "6px", borderRadius: "3px" }}
        />
      ))}
    </div>
  );
}

// ── WIZARD: Lead konvertieren ─────────────────────────────────────────────────
function ConvertWizard({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [leadsLoading, setLL]       = useState(false);
  const [step, setStep]             = useState(0);
  const [dir, setDir]               = useState(1);
  const [selectedLeadId, setSel]    = useState("");
  const [editName, setEditName]     = useState("");
  const [editEmail, setEditEmail]   = useState("");
  const [contract, setContract]     = useState<ContractType>("starter");
  const [startDate, setStart]       = useState(new Date().toISOString().split("T")[0]);
  const [iban, setIban]             = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0); setDir(1);
    setSel(""); setEditName(""); setEditEmail("");
    setContract("starter"); setStart(new Date().toISOString().split("T")[0]);
    setIban("");
    setLL(true);
    api.admin.leads.list()
      .then((data) => {
        const available = data.filter(l => l.status !== "Abgesagt");
        setLeads(available);
        if (available.length > 0) {
          setSel(available[0].id);
          setEditName(available[0].name);
          setEditEmail(available[0].email);
        }
      })
      .catch(() => {})
      .finally(() => setLL(false));
  }, [open]);

  const chosenLead = leads.find(l => l.id === selectedLeadId);
  const handleLeadChange = (id: string) => {
    setSel(id);
    const l = leads.find(ll => ll.id === id);
    if (l) { setEditName(l.name); setEditEmail(l.email); }
  };
  const goNext = () => { setDir(1); setStep(s => s + 1); };
  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!selectedLeadId) return;
    setSaving(true);
    try {
      await api.admin.leads.convertToMember(selectedLeadId, {
        contract_type: contract, start_date: startDate, iban: iban.trim() || undefined,
        name: editName.trim(), email: editEmail.trim(),
      });
      if (contract === "elite") fireEliteConfetti();
      toast.success(`${editName} wurde als Mitglied angelegt!`, {
        description: `Vertrag: ${CONTRACT_OPTIONS.find(c => c.value === contract)?.label} ab ${new Date(startDate).toLocaleDateString("de-DE")}`,
      });
      onSuccess(); onClose();
    } catch { /* via api-service */ } finally { setSaving(false); }
  };

  const selectedContractInfo = CONTRACT_OPTIONS.find(c => c.value === contract)!;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "560px", overflow: "hidden" }}>
        <DialogHeader style={{ paddingBottom: "4px" }}>
          <div className="flex items-center gap-2">
            <UserPlus size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              LEAD KONVERTIEREN
            </DialogTitle>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
              {["Schritt 1/3 – Stammdaten", "Schritt 2/3 – Tarif waehlen", "Schritt 3/3 – Finanzen"][step]}
            </DialogDescription>
            <StepDots step={step} />
          </div>
        </DialogHeader>

        <div style={{ position: "relative", minHeight: "300px", overflow: "hidden" }}>
          <AnimatePresence custom={dir} mode="wait">
            {step === 0 && (
              <motion.div key="step0" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
                style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "8px" }}
              >
                {leadsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--brand)" }} />
                  </div>
                ) : leads.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "32px 0", fontFamily: "var(--font-body)", fontSize: "14px" }}>
                    Keine offenen Leads vorhanden.
                  </p>
                ) : (
                  <>
                    <div>
                      <FieldLabel>Interessent auswaehlen</FieldLabel>
                      <NacSelect value={selectedLeadId} onChange={handleLeadChange}>
                        {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.email} ({l.status})</option>)}
                      </NacSelect>
                    </div>
                    <AnimatePresence mode="wait">
                      {chosenLead && (
                        <motion.div key={chosenLead.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.18)", padding: "10px 14px" }}
                        >
                          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(202,12,133,0.7)", textTransform: "uppercase", marginBottom: "4px" }}>
                            Lead-Vorschau
                          </p>
                          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                            Ziel: {chosenLead.goal} · Status: {chosenLead.status}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <FieldLabel>Vollstaendiger Name</FieldLabel>
                        <Input required value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Max Mustermann" />
                      </div>
                      <div>
                        <FieldLabel>E-Mail-Adresse</FieldLabel>
                        <Input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="max@example.com" />
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
                style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}
              >
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                  Waehle das passende Vertragsmodell fuer <strong style={{ color: "white" }}>{editName}</strong>.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
                  {CONTRACT_OPTIONS.map((opt) => {
                    const active = contract === opt.value;
                    const Icon   = opt.icon;
                    return (
                      <motion.button
                        key={opt.value} type="button" onClick={() => setContract(opt.value)}
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                        style={{
                          padding: "16px 10px",
                          border: active ? `1px solid ${opt.color}` : "1px solid rgba(255,255,255,0.08)",
                          background: active ? `${opt.color}12` : "rgba(255,255,255,0.02)",
                          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                          transition: "all 0.2s", boxShadow: active ? `0 0 20px ${opt.color}20` : "none",
                          position: "relative", overflow: "hidden",
                        }}
                      >
                        {active && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{
                            position: "absolute", top: "8px", right: "8px", width: "16px", height: "16px",
                            background: opt.color, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Check size={9} color="white" strokeWidth={3} />
                          </motion.div>
                        )}
                        <Icon size={20} style={{ color: active ? opt.color : "rgba(255,255,255,0.35)" }} />
                        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "white" : "rgba(255,255,255,0.5)" }}>
                          {opt.label}
                        </p>
                        <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.02em", lineHeight: 1, color: active ? opt.color : "rgba(255,255,255,0.3)" }}>
                          {opt.price}<span style={{ fontSize: "10px", letterSpacing: "0.1em" }}>€</span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>/Mo.</span>
                        </p>
                        <ul style={{ padding: 0, margin: 0, listStyle: "none", width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {opt.features.map(f => (
                            <li key={f} style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: active ? opt.color : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
                style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "8px" }}
              >
                <div style={{ background: `${selectedContractInfo.color}0f`, border: `1px solid ${selectedContractInfo.color}25`, padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  {(() => { const Icon = selectedContractInfo.icon; return <Icon size={18} style={{ color: selectedContractInfo.color, flexShrink: 0 }} />; })()}
                  <div>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: selectedContractInfo.color }}>
                      {selectedContractInfo.label} — {selectedContractInfo.price} €/Mo.
                    </p>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                      Mitglied: {editName} · {editEmail}
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <FieldLabel>Vertragsbeginn *</FieldLabel>
                    <Input type="date" required value={startDate} onChange={(e) => setStart(e.target.value)} style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <FieldLabel>IBAN (SEPA-Mandat)</FieldLabel>
                    <Input placeholder="DE89 3704 0044 ..." value={iban} onChange={(e) => setIban(e.target.value)} />
                  </div>
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                  Mit dem Anlegen des Mitglieds bestaetigst du, dass ein gueltiger Vertrag vorliegt.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter style={{ gap: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px", marginTop: "4px" }}>
          {step > 0 && (
            <Button variant="outline" onClick={goBack} disabled={saving} style={{ gap: "6px" }}>
              <ArrowLeft size={14} /> Zurueck
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {step < 2 ? (
            <Button onClick={goNext} disabled={leadsLoading || (step === 0 && (!selectedLeadId || !editName.trim() || !editEmail.trim()))} style={{ gap: "6px" }}>
              Weiter <ArrowRight size={14} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving} style={{ gap: "6px" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Wird angelegt...</> : <><Check size={14} /> MITGLIED ANLEGEN</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
function AdminChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", borderRadius: "4px" }}>
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: p.color, marginTop: "2px" }}>
          {p.name}: {p.value} {p.dataKey === "weight" ? "kg" : "%"}
        </p>
      ))}
    </div>
  );
}

// ── SHEET: Member Detail (Legacy – ersetzt durch MemberProfileSheet) ──────────
// Wird intern fuer Fitness/Tracking behalten, koennte spaeters extrahiert werden
function MemberDetailSheet({ member, onClose, onSuccess }: {
  member: Member | null; onClose: () => void; onSuccess: () => void;
}) {
  const [tab, setTab] = useState<"stammdaten" | "ernaehrung">("stammdaten");
  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhoneVal]          = useState("");
  const [savingStamm, setSavingStamm] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [measurements, setMeasurements]       = useState<any[]>([]);
  const [memberGoals, setMemberGoals]         = useState<any>(null);
  const [caloriesGoal, setCaloriesGoal] = useState("");
  const [proteinGoal, setProteinGoal]   = useState("");
  const [carbsGoal, setCarbsGoal]       = useState("");
  const [fatGoal, setFatGoal]           = useState("");
  const [savingGoals, setSavingGoals]   = useState(false);

  useEffect(() => {
    if (!member) return;
    setTab("stammdaten");
    setFirstName(member.first_name);
    setLastName(member.last_name);
    setEmail(member.email);
    setPhoneVal(member.phone ?? "");
    setTrackingLoading(true);
    api.admin.tracking.getMemberData(member.id)
      .then((data: any) => {
        setMeasurements(data.measurements ?? []);
        const g = data.goals;
        setMemberGoals(g);
        if (g) {
          setCaloriesGoal(String(g.calories_goal ?? ""));
          setProteinGoal(String(g.protein_goal ?? ""));
          setCarbsGoal(String(g.carbs_goal ?? ""));
          setFatGoal(String(g.fat_goal ?? ""));
        } else {
          setCaloriesGoal(""); setProteinGoal(""); setCarbsGoal(""); setFatGoal("");
        }
      })
      .catch(() => {
        setMeasurements([
          { date: "2026-01-05", weight: 87.2, body_fat: 22.1 },
          { date: "2026-01-12", weight: 86.5, body_fat: 21.8 },
          { date: "2026-01-19", weight: 86.0, body_fat: 21.4 },
          { date: "2026-01-26", weight: 85.3, body_fat: 21.0 },
          { date: "2026-02-02", weight: 84.8, body_fat: 20.6 },
          { date: "2026-02-09", weight: 84.2, body_fat: 20.2 },
          { date: "2026-02-16", weight: 83.9, body_fat: 19.9 },
        ]);
        setMemberGoals({ calories_goal: 2200, protein_goal: 160, carbs_goal: 220, fat_goal: 70 });
        setCaloriesGoal("2200"); setProteinGoal("160"); setCarbsGoal("220"); setFatGoal("70");
      })
      .finally(() => setTrackingLoading(false));
  }, [member]);

  const chartData = useMemo(() =>
    measurements
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m: any) => ({
        date: new Date(m.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
        weight: m.weight, body_fat: m.body_fat,
      })),
  [measurements]);

  const handleSaveStammdaten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSavingStamm(true);
    try {
      await api.admin.members.update(member.id, {
        first_name: firstName.trim(), last_name: lastName.trim(),
        email: email.trim(), phone: phone.trim() || undefined,
      });
      toast.success("Stammdaten aktualisiert");
      onSuccess();
    } catch { /* api-service */ } finally { setSavingStamm(false); }
  };

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSavingGoals(true);
    try {
      await api.admin.tracking.setGoals(member.id, {
        calories_goal: parseInt(caloriesGoal) || 0,
        protein_goal: parseInt(proteinGoal) || 0,
        carbs_goal: parseInt(carbsGoal) || 0,
        fat_goal: parseInt(fatGoal) || 0,
      });
      toast.success("Ernaehrungsziele gespeichert");
    } catch { /* api-service */ } finally { setSavingGoals(false); }
  };

  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="!w-full !max-w-[540px] overflow-y-auto" style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.06)" }}>
        <SheetHeader className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <UserIcon size={18} style={{ color: "var(--brand)" }} />
            <SheetTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              {member?.first_name} {member?.last_name}
            </SheetTitle>
          </div>
          <SheetDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {member?.email} · Seit {member?.member_since ? new Date(member.member_since).toLocaleDateString("de-DE") : "–"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex gap-0 px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {([
            { key: "stammdaten" as const, label: "Stammdaten" },
            { key: "ernaehrung" as const, label: "Fitness & Ernaehrung" },
          ]).map(({ key, label }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} className="flex-1 cursor-pointer transition-all duration-200"
                style={{
                  background: "none", border: "none", minHeight: "44px",
                  fontFamily: "var(--font-condensed)", fontSize: "12px",
                  fontWeight: active ? 700 : 500, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: active ? "var(--brand)" : "rgba(255,255,255,0.4)",
                  borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === "stammdaten" ? (
            <motion.form key="stammdaten" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onSubmit={handleSaveStammdaten} className="space-y-3 px-5" style={{ paddingTop: "16px" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><FieldLabel>Vorname</FieldLabel><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                <div><FieldLabel>Nachname</FieldLabel><Input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><FieldLabel>E-Mail</FieldLabel><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><FieldLabel>Telefon</FieldLabel><Input value={phone} onChange={(e) => setPhoneVal(e.target.value)} placeholder="+49 ..." /></div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <MemberStatusBadge status={member?.status ?? "active"} />
                  {member?.is_blocked && <BlockedBadge />}
                  {member?.magicline_customer_status && <MlStatusBadge status={member.magicline_customer_status} />}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <Button type="button" variant="outline" onClick={onClose}>Schliessen</Button>
                <Button type="submit" disabled={savingStamm} style={{ gap: "6px" }}>
                  {savingStamm ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Speichern
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div key="ernaehrung" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="space-y-4 px-5 pb-6" style={{ paddingTop: "16px" }}
            >
              {trackingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--brand)" }} />
                </div>
              ) : (
                <>
                  {chartData.length > 1 && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px", padding: "12px 4px 4px 0" }}>
                      <p style={{ ...LABEL_STYLE, paddingLeft: "12px", marginBottom: "8px" }}>Gewichtsverlauf</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="adminWeightGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#CA0C85" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#CA0C85" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} />
                          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} width={35} />
                          <Tooltip content={<AdminChartTooltip />} />
                          <Area type="monotone" dataKey="weight" name="Gewicht" stroke="#CA0C85" strokeWidth={2} fill="url(#adminWeightGrad)" dot={{ r: 2, fill: "#CA0C85" }} />
                          <Area type="monotone" dataKey="body_fat" name="KFA" stroke="#60a5fa" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={{ r: 2, fill: "#60a5fa" }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {chartData.length <= 1 && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px", padding: "20px", textAlign: "center" }}>
                      <Activity size={24} style={{ color: "rgba(255,255,255,0.1)", marginBottom: "8px", display: "inline-block" }} />
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>Noch nicht genuegend Messdaten vorhanden.</p>
                    </div>
                  )}
                  {memberGoals && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                      {[
                        { label: "Kalorien", val: memberGoals.calories_goal, unit: "kcal", color: "#f59e0b", icon: Flame },
                        { label: "Protein",  val: memberGoals.protein_goal,  unit: "g",    color: "#34d399", icon: Beef },
                        { label: "Carbs",    val: memberGoals.carbs_goal,    unit: "g",    color: "#60a5fa", icon: Wheat },
                        { label: "Fett",     val: memberGoals.fat_goal,      unit: "g",    color: "#a78bfa", icon: Droplets },
                      ].map(({ label, val, unit, color, icon: Icon }) => (
                        <div key={label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "10px", borderRadius: "4px", textAlign: "center" }}>
                          <Icon size={14} style={{ color, marginBottom: "4px", display: "inline-block" }} />
                          <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", color, lineHeight: 1 }}>{val ?? "–"}</p>
                          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginTop: "2px" }}>{label} ({unit})</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSaveGoals} className="space-y-3">
                    <p style={{ ...LABEL_STYLE, marginBottom: "2px" }}>Ernaehrungsziele setzen</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div><FieldLabel>Kalorien (kcal)</FieldLabel><Input type="number" value={caloriesGoal} onChange={(e) => setCaloriesGoal(e.target.value)} placeholder="2200" /></div>
                      <div><FieldLabel>Protein (g)</FieldLabel><Input type="number" value={proteinGoal} onChange={(e) => setProteinGoal(e.target.value)} placeholder="160" /></div>
                      <div><FieldLabel>Carbs (g)</FieldLabel><Input type="number" value={carbsGoal} onChange={(e) => setCarbsGoal(e.target.value)} placeholder="220" /></div>
                      <div><FieldLabel>Fett (g)</FieldLabel><Input type="number" value={fatGoal} onChange={(e) => setFatGoal(e.target.value)} placeholder="70" /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <Button type="button" variant="outline" onClick={onClose}>Schliessen</Button>
                      <Button type="submit" disabled={savingGoals} style={{ gap: "6px" }}>
                        {savingGoals ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />} Ziele speichern
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

// ── DIALOG: Mitglied manuell anlegen ─────────────────────────────────────────
function CreateMemberDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [email,       setEmail]       = useState("");
  const [phone,       setPhone]       = useState("");
  const [birthDate,   setBirthDate]   = useState("");
  const [contract,    setContract]    = useState<ContractType>("starter");
  const [startDate,   setStartDate]   = useState(new Date().toISOString().split("T")[0]);
  const [createLogin, setCreateLogin] = useState(true);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(""); setLastName(""); setEmail("");
    setPhone(""); setBirthDate("");
    setContract("starter");
    setStartDate(new Date().toISOString().split("T")[0]);
    setCreateLogin(true);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setSaving(true);
    try {
      await api.admin.members.create({
        first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(),
        phone: phone.trim() || undefined, birth_date: birthDate || undefined,
        contract_type: contract, member_since: startDate,
        create_login: createLogin, initial_password: createLogin ? "Start123!" : undefined,
      });
      toast.success(`${firstName} ${lastName} wurde als Mitglied angelegt!`, {
        description: createLogin ? "Login: " + email.trim() + " / Passwort: Start123!" : undefined,
      });
    } catch { /* toast via api-service */ } finally {
      setSaving(false); onSuccess(); onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "580px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <PlusCircle size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Mitglied Anlegen
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            Neues Mitglied manuell im System erfassen
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "4px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><FieldLabel>Vorname *</FieldLabel><Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Max" /></div>
            <div><FieldLabel>Nachname *</FieldLabel><Input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mustermann" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><FieldLabel>E-Mail *</FieldLabel><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@example.com" /></div>
            <div><FieldLabel>Telefon</FieldLabel><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 176 ..." /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><FieldLabel>Geburtsdatum</FieldLabel><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ colorScheme: "dark" }} /></div>
            <div><FieldLabel>Vertragsstart *</FieldLabel><Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ colorScheme: "dark" }} /></div>
          </div>
          <div>
            <FieldLabel>Tarif *</FieldLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
              {CONTRACT_OPTIONS.map((opt) => {
                const active = contract === opt.value;
                const Icon   = opt.icon;
                return (
                  <button key={opt.value} type="button" onClick={() => setContract(opt.value)}
                    style={{
                      padding: "12px 8px", border: active ? `1px solid ${opt.color}` : "1px solid rgba(255,255,255,0.08)",
                      background: active ? `${opt.color}12` : "rgba(255,255,255,0.02)",
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                      transition: "all 0.18s", boxShadow: active ? `0 0 16px ${opt.color}20` : "none",
                    }}
                  >
                    <Icon size={16} style={{ color: active ? opt.color : "rgba(255,255,255,0.3)" }} />
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "white" : "rgba(255,255,255,0.4)" }}>
                      {opt.label}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: active ? opt.color : "rgba(255,255,255,0.25)", lineHeight: 1 }}>
                      {opt.price}<span style={{ fontSize: "9px" }}>€</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{
            display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px",
            background: createLogin ? "rgba(202,12,133,0.07)" : "rgba(255,255,255,0.02)",
            border: createLogin ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.07)",
            cursor: "pointer", transition: "all 0.18s",
          }}>
            <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)}
              style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "var(--brand)", flexShrink: 0, cursor: "pointer" }} />
            <div>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "white" }}>
                Login-Account erstellen
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>
                Das Mitglied erhaelt Zugang zur Member-App. Initiales Passwort:&nbsp;
                <span style={{ color: "rgba(202,12,133,0.8)", fontFamily: "monospace" }}>Start123!</span>
              </p>
            </div>
          </label>

          <DialogFooter style={{ gap: "8px", paddingTop: "4px" }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()} style={{ gap: "6px" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Wird angelegt...</> : <><PlusCircle size={14} /> MITGLIED ANLEGEN</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG: Mitglied loeschen ─────────────────────────────────────────────────
function DeleteMemberDialog({ member, onClose, onConfirm }: {
  member: Member | null; onClose: () => void; onConfirm: (m: Member) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!member) return;
    setDeleting(true);
    onConfirm(member);
    onClose();
    setDeleting(false);
  };
  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)", maxWidth: "440px" }}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Trash2 size={16} style={{ color: "#F87171" }} />
            </div>
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Mitglied loeschen
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.45)", fontSize: "14px", lineHeight: 1.6, paddingTop: "4px" }}>
            Soll <span style={{ color: "#fff", fontWeight: 600 }}>{member?.first_name} {member?.last_name}</span> wirklich endgueltig geloescht werden? Dieser Vorgang kann nicht rueckgaengig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter style={{ marginTop: "16px", gap: "8px" }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>Abbrechen</Button>
          <Button type="button" disabled={deleting} onClick={handleDelete} style={{ background: "rgba(248,113,113,0.8)", gap: "6px" }}>
            {deleting ? <><Loader2 size={13} className="animate-spin" /> Loeschen...</> : <><Trash2 size={13} /> Endgueltig loeschen</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Kebab Dropdown Menu ───────────────────────────────────────────────────────
function MemberKebabMenu({ member, unlockingId, onEdit, onCheckIn, onNotes, onBlock, onUnblock, onDelete }: {
  member: Member; unlockingId: string | null;
  onEdit:    (m: Member) => void;
  onCheckIn: (m: Member) => void;
  onNotes:   (m: Member) => void;
  onBlock:   (m: Member) => void;
  onUnblock: (m: Member) => void;
  onDelete:  (m: Member) => void;
}) {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-condensed)", fontSize: "12px", letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.82)", cursor: "pointer", minHeight: "36px", gap: "8px",
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-8 shrink-0 border border-white/[0.08] bg-white/[0.04] text-white/[0.45] hover:bg-white/[0.09] hover:text-white"
        >
          <MoreVertical size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[220px]"
        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={() => onEdit(member)} style={base}>
          <Pencil size={13} /> Profil ansehen / bearbeiten
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCheckIn(member)} style={base}>
          <QrCode size={13} /> Check-In Code anzeigen
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNotes(member)} style={base}>
          <StickyNote size={13} /> Notizen hinzufuegen
        </DropdownMenuItem>

        <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.07)" }} />

        {member.is_blocked ? (
          <DropdownMenuItem
            onClick={() => onUnblock(member)} disabled={unlockingId === member.id}
            style={{ ...base, color: "#fb923c" }}
          >
            {unlockingId === member.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            Mitglied entsperren
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onBlock(member)} style={{ ...base, color: "#fb923c" }}>
            <ShieldOff size={13} /> Mitglied sperren
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => onDelete(member)} style={{ ...base, color: "#f87171" }}>
          <Trash2 size={13} /> Mitglied loeschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Mobile Member Card ────────────────────────────────────────────────────────
function MemberCard({ member, unlockingId, onEdit, onCheckIn, onNotes, onBlock, onUnblock, onDelete }: {
  member: Member; unlockingId: string | null;
  onEdit:    (m: Member) => void;
  onCheckIn: (m: Member) => void;
  onNotes:   (m: Member) => void;
  onBlock:   (m: Member) => void;
  onUnblock: (m: Member) => void;
  onDelete:  (m: Member) => void;
}) {
  const initials = `${member.first_name[0] ?? ""}${member.last_name[0] ?? ""}`.toUpperCase();
  const ci       = CONTRACT_OPTIONS.find(c => c.value === member.contract_type);
  const PlanIcon = ci?.icon ?? Zap;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        padding: "14px", cursor: "pointer",
      }}
      onClick={() => onEdit(member)}
    >
      {/* Top row: Avatar + Name + Kebab */}
      <div className="flex items-start gap-3">
        <div style={{
          width: "42px", height: "42px", flexShrink: 0,
          background: member.magicline_id ? "rgba(96,165,250,0.12)" : "rgba(202,12,133,0.12)",
          border: member.magicline_id ? "1px solid rgba(96,165,250,0.25)" : "1px solid rgba(202,12,133,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontSize: "16px",
          letterSpacing: "0.04em", color: member.magicline_id ? "#60a5fa" : "var(--brand)",
        }}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.06em", color: "white", textTransform: "uppercase" }}>
              {member.first_name} {member.last_name}
            </p>
            {member.magicline_id && (
              <span style={{ fontSize: "9px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(96,165,250,0.8)", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", padding: "1px 5px" }}>ML</span>
            )}
            {member.is_blocked && (
              <span style={{ fontSize: "9px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.12em", color: "var(--brand)", display: "flex", alignItems: "center", gap: "3px" }}>
                <ShieldOff size={9} /> GESPERRT
              </span>
            )}
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
            <Mail size={9} /> {member.email}
          </p>
          {member.phone && (
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Phone size={9} /> {member.phone}
            </p>
          )}
        </div>

        {/* Kebab – stop propagation von Card-Click */}
        <div onClick={(e) => e.stopPropagation()}>
          <MemberKebabMenu
            member={member} unlockingId={unlockingId}
            onEdit={onEdit} onCheckIn={onCheckIn} onNotes={onNotes}
            onBlock={onBlock} onUnblock={onUnblock} onDelete={onDelete}
          />
        </div>
      </div>

      {/* Badge row */}
      <div className="flex items-center gap-2 flex-wrap mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <MemberStatusBadge status={member.status} />
        {member.magicline_customer_status && (
          <MlStatusBadge status={member.magicline_customer_status} />
        )}
        {ci && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap",
            color: ci.color, background: `${ci.color}12`, padding: "2px 8px",
          }}>
            <PlanIcon size={9} /> {ci.label}
          </span>
        )}
        <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
          Seit {new Date(member.member_since).toLocaleDateString("de-DE")}
        </span>
      </div>
    </motion.div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function AdminMembers() {
  const location = useLocation();
  const [members, setMembers]         = useState<Member[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [blockTarget, setBlockTarget] = useState<Member | null>(null);
  const [convertOpen, setConvert]     = useState(false);
  const [unlockingId, setUnlocking]   = useState<string | null>(null);
  const [detailMember, setDetailMember]       = useState<Member | null>(null);
  const [createOpen, setCreateOpen]           = useState(false);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<Member | null>(null);
  const [checkInTarget, setCheckInTarget]     = useState<Member | null>(null);
  const [notesTarget, setNotesTarget]         = useState<Member | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.admin.members.list();
      setMembers(data);
    } catch { /* via api-service */ } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [location.key]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleUnblock = async (member: Member) => {
    setUnlocking(member.id);
    try {
      await api.admin.members.unblock(member.id);
      toast.success(`${member.first_name} ${member.last_name} wurde entsperrt.`);
      loadData();
    } catch { /* via api-service */ } finally { setUnlocking(null); }
  };

  const handleDeleteMember = (member: Member) => {
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    api.admin.members.deleteMember(member.id).catch(() => {});
    toast.success(`${member.first_name} ${member.last_name} wurde geloescht.`, {
      description: "Das Mitglied wurde aus dem System entfernt.",
    });
  };

  const stats = useMemo(() => ({
    total:   members.length,
    active:  members.filter(m => m.status === "active" && !m.is_blocked).length,
    blocked: members.filter(m => m.is_blocked).length,
    frozen:  members.filter(m => m.status === "frozen").length,
  }), [members]);

  // ── Desktop Tabellen-Columns ───────────────────────────────────────────────
  const columns = [
    {
      key: "name", header: "Mitglied",
      cell: (m: Member) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em", color: "white", textTransform: "uppercase" }}>
              {m.first_name} {m.last_name}
            </span>
            {m.magicline_id && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px",
                background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)",
                fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700,
                letterSpacing: "0.14em", color: "rgba(96,165,250,0.8)", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>ML</span>
            )}
          </div>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Mail size={9} /> {m.email}
          </span>
          {m.phone && (
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Phone size={9} /> {m.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "contract_type", header: "Vertrag",
      cell: (m: Member) => {
        const ci = CONTRACT_OPTIONS.find(c => c.value === m.contract_type);
        const Icon = ci?.icon ?? Zap;
        const isMl = !!m.magicline_id;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
              color: ci?.color ?? (isMl ? "rgba(160,200,255,0.7)" : "rgba(255,255,255,0.4)"),
              textTransform: "uppercase", background: "rgba(255,255,255,0.04)", padding: "3px 8px", whiteSpace: "nowrap",
            }}>
              <Icon size={10} style={{ color: ci?.color ?? (isMl ? "#60a5fa" : undefined) }} />
              {m.contract_type ?? (isMl ? "ML-Import" : "–")}
            </span>
            {isMl && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(96,165,250,0.7)", textTransform: "uppercase" }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="4" cy="4" r="3.5" stroke="rgba(96,165,250,0.7)" strokeWidth="1" />
                  <circle cx="4" cy="4" r="1.5" fill="rgba(96,165,250,0.7)" />
                </svg>
                Magicline
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status", header: "Status",
      cell: (m: Member) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <MemberStatusBadge status={m.status} />
          {m.is_blocked && <BlockedBadge />}
          {m.magicline_customer_status && <MlStatusBadge status={m.magicline_customer_status} />}
        </div>
      ),
    },
    {
      key: "member_since", header: "Seit",
      cell: (m: Member) => (
        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
          {new Date(m.member_since).toLocaleDateString("de-DE")}
        </span>
      ),
    },
    {
      key: "actions", header: "",
      cell: (m: Member) => (
        <div onClick={(e) => e.stopPropagation()}>
          <MemberKebabMenu
            member={m} unlockingId={unlockingId}
            onEdit={(x)    => setDetailMember(x)}
            onCheckIn={(x) => setCheckInTarget(x)}
            onNotes={(x)   => setNotesTarget(x)}
            onBlock={(x)   => setBlockTarget(x)}
            onUnblock={(x) => handleUnblock(x)}
            onDelete={(x)  => setDeleteMemberTarget(x)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", letterSpacing: "0.04em", lineHeight: 1, textTransform: "uppercase" }}>
            MITGLIEDER<span style={{ color: "var(--brand)" }}>VERWALTUNG</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            Vertraege, Account-Status und Sperrungen verwalten
          </p>
        </div>
        <Button onClick={() => setConvert(true)} variant="outline" className="shrink-0" style={{ gap: "8px" }}>
          <UserPlus size={16} /> LEAD KONVERTIEREN
        </Button>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0" style={{ gap: "8px" }}>
          <PlusCircle size={16} /> MITGLIED ANLEGEN
        </Button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
        {[
          { label: "Gesamt",      value: stats.total,   color: "rgba(255,255,255,0.7)" },
          { label: "Aktiv",       value: stats.active,  color: "#4ade80"               },
          { label: "Gesperrt",    value: stats.blocked, color: "var(--brand)"          },
          { label: "Eingefroren", value: stats.frozen,  color: "#60a5fa"               },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px" }}
          >
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: "6px" }}>
              {k.label}
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "0.02em", color: k.color, lineHeight: 1 }}>
              {loading ? "—" : k.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Suche */}
      <div style={{ position: "relative", maxWidth: "400px" }}>
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
        <Input
          placeholder="Name oder E-Mail suchen..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "36px" }}
        />
        <AnimatePresence>
          {search && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "2px" }}
            >
              <X size={13} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop: Tabelle (ab md) ── */}
      <motion.div
        className="hidden md:block"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
      >
        <DataTable
          loading={loading} data={filtered} keyField="id" columns={columns} pageSize={15}
          emptyMessage={search ? `Kein Mitglied fuer "${search}" gefunden.` : "Noch keine Mitglieder vorhanden."}
          onRowClick={(m) => setDetailMember(m)}
        />
      </motion.div>

      {/* ── Mobile: Cards (unter md) ── */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", fontSize: "14px" }}>
            {search ? `Kein Mitglied fuer "${search}" gefunden.` : "Noch keine Mitglieder vorhanden."}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((m) => (
              <MemberCard
                key={m.id} member={m} unlockingId={unlockingId}
                onEdit={(x)    => setDetailMember(x)}
                onCheckIn={(x) => setCheckInTarget(x)}
                onNotes={(x)   => setNotesTarget(x)}
                onBlock={(x)   => setBlockTarget(x)}
                onUnblock={(x) => handleUnblock(x)}
                onDelete={(x)  => setDeleteMemberTarget(x)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Dialoge */}
      <BlockDialog member={blockTarget} onClose={() => setBlockTarget(null)} onSuccess={loadData} />
      <ConvertWizard open={convertOpen} onClose={() => setConvert(false)} onSuccess={loadData} />
      <CreateMemberSheet open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={loadData} />
      <MemberProfileSheet member={detailMember} onClose={() => setDetailMember(null)} onSuccess={loadData} />
      <DeleteMemberDialog member={deleteMemberTarget} onClose={() => setDeleteMemberTarget(null)} onConfirm={handleDeleteMember} />
      <CheckInCodeDialog member={checkInTarget} onClose={() => setCheckInTarget(null)} />
      <NotesDialog member={notesTarget} onClose={() => setNotesTarget(null)} onSuccess={loadData} />
    </div>
  );
}

/**
 * AdminLeads.tsx – Lead-CRM (Enterprise Standard v2)
 *
 * Neu in dieser Version:
 *  - LeadType (trial / contact) aus DB-Spalte `type`
 *  - assigned_to  – Zuweisung an Mitarbeiter (users-Tabelle)
 *  - last_contact – Datum des letzten Kontakts
 *  - next_contact – Datum des naechsten geplanten Kontakts
 *  - Filter-Bar: Suche, Status, Typ, Ziel, Zugewiesen an, Kontakt-Faelligkeit
 *  - Korrekte DB-Feldnamen (desired_date / created_at via normalizeLead)
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Mail, Phone, MoreVertical, Trash2, UserPlus, Loader2,
  Save, ArrowRight, ArrowLeft, Check, Zap, Star, Crown,
  User as UserIcon, StickyNote, ChevronDown, Search, X,
  CalendarClock, Calendar, Filter, UserCheck,
} from "lucide-react";
import {
  api, Lead, LeadStatus, LeadGoal, LeadType, ContractType, StaffUser,
} from "@/lib/api-service";
import { DataTable } from "@/app/components/ui/DataTable";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/app/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/app/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { toast } from "sonner";

// ── Konstanten ────────────────────────────────────────────────────────────────
const LEAD_STATUS_CONFIG: Record<LeadStatus, { bg: string; text: string; dot: string }> = {
  Neu:         { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", dot: "#60a5fa" },
  Kontaktiert: { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", dot: "#fbbf24" },
  "Bestätigt": { bg: "rgba(34,197,94,0.10)",   text: "#4ade80", dot: "#4ade80" },
  Abgesagt:    { bg: "rgba(100,116,139,0.14)", text: "#94a3b8", dot: "#94a3b8" },
};

const GOAL_LABELS: Record<LeadGoal, string> = {
  fitness:      "Allgemeine Fitness",
  muskelaufbau: "Muskelaufbau",
  abnehmen:     "Abnehmen",
  crossfit:     "CrossFit",
};

const TYPE_CONFIG: Record<LeadType, { label: string; bg: string; text: string }> = {
  trial:   { label: "Probetraining",  bg: "rgba(202,12,133,0.1)",  text: "rgba(202,12,133,0.85)" },
  contact: { label: "Kontaktanfrage", bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.45)" },
};

const CONTRACT_OPTIONS: {
  value: ContractType; label: string; price: string; icon: React.ElementType; color: string;
}[] = [
  { value: "starter",     label: "STARTER",    price: "39", icon: Zap,   color: "#60a5fa"       },
  { value: "performance", label: "PERFORMANCE", price: "59", icon: Star,  color: "#f59e0b"       },
  { value: "elite",       label: "ELITE",       price: "89", icon: Crown, color: "var(--brand)"  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", hr: "HR", finance: "Finanzen",
  trainer: "Trainer", frontdesk: "Empfang",
};

// ── Filter-State ──────────────────────────────────────────────────────────────
interface LeadFilters {
  search:          string;
  status:          LeadStatus | "";
  type:            LeadType | "";
  goal:            LeadGoal | "";
  assignedTo:      string;   // "" = alle | "none" = nicht zugewiesen | user-id
  nextContactRange: "all" | "overdue" | "today" | "week" | "none";
}

const EMPTY_FILTERS: LeadFilters = {
  search: "", status: "", type: "", goal: "", assignedTo: "", nextContactRange: "all",
};

function countActiveFilters(f: LeadFilters) {
  let n = 0;
  if (f.search)               n++;
  if (f.status)               n++;
  if (f.type)                 n++;
  if (f.goal)                 n++;
  if (f.assignedTo)           n++;
  if (f.nextContactRange !== "all") n++;
  return n;
}

function applyFilters(leads: Lead[], f: LeadFilters): Lead[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  return leads.filter((l) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) &&
          !l.email.toLowerCase().includes(q) &&
          !(l.phone?.toLowerCase().includes(q) ?? false)) return false;
    }
    if (f.status && l.status !== f.status) return false;
    if (f.type   && l.type   !== f.type)   return false;
    if (f.goal   && l.goal   !== f.goal)   return false;
    if (f.assignedTo === "none" && l.assigned_to) return false;
    if (f.assignedTo && f.assignedTo !== "none" && l.assigned_to !== f.assignedTo) return false;
    if (f.nextContactRange !== "all") {
      if (f.nextContactRange === "none") {
        if (l.next_contact) return false;
      } else if (!l.next_contact) {
        return false;
      } else {
        const d = new Date(l.next_contact); d.setHours(0, 0, 0, 0);
        if (f.nextContactRange === "overdue" && d >= today)        return false;
        if (f.nextContactRange === "today"   && d.getTime() !== today.getTime()) return false;
        if (f.nextContactRange === "week"    && (d < today || d > weekEnd)) return false;
      }
    }
    return true;
  });
}

function nacLeadId(id: string) {
  const n = parseInt(id, 10);
  return `L-${isNaN(n) ? id.slice(-4).toUpperCase() : String(n).padStart(3, "0")}`;
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return d < t;
}
function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return d.getTime() === t.getTime();
}
function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
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

function NacSelect({ value, onChange, disabled, children, style }: {
  value: string; onChange: (v: string) => void;
  disabled?: boolean; children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative", ...style }}>
      <select
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        style={{
          width: "100%", appearance: "none", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", color: "white",
          fontFamily: "var(--font-body)", fontSize: "13px", padding: "8px 32px 8px 10px",
          outline: "none", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1, transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        {children}
      </select>
      <ChevronDown size={12} style={{
        position: "absolute", right: "9px", top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.35)",
      }} />
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────
function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const s = LEAD_STATUS_CONFIG[status] ?? LEAD_STATUS_CONFIG["Neu"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px",
      background: s.bg, fontFamily: "var(--font-condensed)", fontSize: "10px",
      fontWeight: 700, letterSpacing: "0.1em", color: s.text, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: LeadType }) {
  const c = TYPE_CONFIG[type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 7px",
      background: c.bg, fontFamily: "var(--font-condensed)", fontSize: "9px",
      fontWeight: 700, letterSpacing: "0.12em", color: c.text, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

function MlLeadBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 7px",
      border: "1px solid rgba(202,12,133,0.5)", background: "rgba(202,12,133,0.08)",
      fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
      letterSpacing: "0.14em", color: "rgba(202,12,133,0.9)", textTransform: "uppercase",
    }}>
      ML Lead
    </span>
  );
}

function NextContactBadge({ date }: { date: string | null | undefined }) {
  if (!date) return <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>—</span>;
  const overdue = isOverdue(date);
  const today   = isToday(date);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontFamily: "var(--font-body)", fontSize: "12px",
      color: overdue ? "#f87171" : today ? "#fbbf24" : "rgba(255,255,255,0.5)",
    }}>
      <CalendarClock size={11} />
      {fmtDate(date)}
      {overdue && <span style={{ fontSize: "9px", letterSpacing: "0.1em", fontFamily: "var(--font-condensed)", fontWeight: 700, color: "#f87171" }}>FAELLIG</span>}
      {today   && <span style={{ fontSize: "9px", letterSpacing: "0.1em", fontFamily: "var(--font-condensed)", fontWeight: 700, color: "#fbbf24" }}>HEUTE</span>}
    </span>
  );
}

function AssignedBadge({ name }: { name: string | null | undefined }) {
  if (!name) return <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>—</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.6)",
    }}>
      <span style={{
        width: "18px", height: "18px", background: "rgba(202,12,133,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <UserCheck size={10} style={{ color: "rgba(202,12,133,0.8)" }} />
      </span>
      {name}
    </span>
  );
}

// ── DIALOG: Lead loeschen ─────────────────────────────────────────────────────
function DeleteLeadDialog({ lead, onClose, onSuccess }: {
  lead: Lead | null; onClose: () => void; onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!lead) return;
    setDeleting(true);
    try {
      await api.admin.leads.delete(lead.id);
      toast.success(`Lead "${lead.name}" geloescht.`);
      onSuccess(); onClose();
    } catch { /* via api-service */ } finally { setDeleting(false); }
  };
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "420px" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
            Lead loeschen?
          </DialogTitle>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            "{lead?.name}" wird dauerhaft entfernt. Diese Aktion kann nicht rueckgaengig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter style={{ gap: "8px", paddingTop: "8px" }}>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Abbrechen</Button>
          <Button onClick={handleDelete} disabled={deleting} style={{ background: "rgba(239,68,68,0.85)", boxShadow: "0 0 16px rgba(239,68,68,0.2)" }}>
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Loeschen...</> : <><Trash2 size={14} /> LOESCHEN</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG: Konvertieren (2-Step) ─────────────────────────────────────────────
function ConvertLeadDialog({ lead, onClose, onSuccess }: {
  lead: Lead | null; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep]         = useState(0);
  const [contract, setContract] = useState<ContractType>("starter");
  const [startDate, setStart]   = useState(new Date().toISOString().split("T")[0]);
  const [iban, setIban]         = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (lead) { setStep(0); setContract("starter"); setStart(new Date().toISOString().split("T")[0]); setIban(""); }
  }, [lead]);

  const handleSubmit = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      await api.admin.leads.convertToMember(lead.id, {
        contract_type: contract, start_date: startDate,
        iban: iban.trim() || undefined, name: lead.name, email: lead.email,
      });
      toast.success(`${lead.name} wurde als Mitglied angelegt!`);
      onSuccess(); onClose();
    } catch { /* via api-service */ } finally { setSaving(false); }
  };

  const selContract = CONTRACT_OPTIONS.find((c) => c.value === contract)!;

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "520px", overflow: "hidden" }}>
        <DialogHeader style={{ paddingBottom: "4px" }}>
          <div className="flex items-center gap-2">
            <UserPlus size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              LEAD KONVERTIEREN
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {step === 0 ? `Schritt 1/2 – Tarif fuer ${lead?.name}` : `Schritt 2/2 – Vertragsbeginn & Finanzen`}
          </DialogDescription>
        </DialogHeader>

        <div style={{ minHeight: "220px", paddingTop: "8px" }}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}
              >
                {CONTRACT_OPTIONS.map((opt) => {
                  const active = contract === opt.value;
                  const Icon = opt.icon;
                  return (
                    <motion.button key={opt.value} type="button" onClick={() => setContract(opt.value)}
                      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                      style={{
                        padding: "14px 8px", cursor: "pointer",
                        border: active ? `1px solid ${opt.color}` : "1px solid rgba(255,255,255,0.08)",
                        background: active ? `${opt.color}12` : "rgba(255,255,255,0.02)",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                        transition: "all 0.2s", boxShadow: active ? `0 0 20px ${opt.color}20` : "none",
                      }}
                    >
                      <Icon size={20} style={{ color: active ? opt.color : "rgba(255,255,255,0.3)" }} />
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "white" : "rgba(255,255,255,0.4)" }}>
                        {opt.label}
                      </p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.02em", lineHeight: 1, color: active ? opt.color : "rgba(255,255,255,0.25)" }}>
                        {opt.price}<span style={{ fontSize: "10px" }}>€</span><span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>/Mo.</span>
                      </p>
                      {active && <Check size={12} style={{ color: opt.color }} />}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                <div style={{ background: `${selContract.color}0f`, border: `1px solid ${selContract.color}25`, padding: "10px 14px" }}>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: selContract.color }}>
                    {selContract.label} — {selContract.price} EUR/Mo.
                  </p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    {lead?.name} &middot; {lead?.email}
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <FieldLabel>Vertragsbeginn *</FieldLabel>
                    <Input type="date" required value={startDate} onChange={(e) => setStart(e.target.value)} style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <FieldLabel>IBAN (optional)</FieldLabel>
                    <Input placeholder="DE89 3704 0044 ..." value={iban} onChange={(e) => setIban(e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter style={{ gap: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px", marginTop: "4px" }}>
          {step > 0 && <Button variant="outline" onClick={() => setStep(0)} disabled={saving} style={{ gap: "6px" }}><ArrowLeft size={14} /> Zurueck</Button>}
          <div style={{ flex: 1 }} />
          {step === 0
            ? <Button onClick={() => setStep(1)} style={{ gap: "6px" }}>Weiter <ArrowRight size={14} /></Button>
            : <Button onClick={handleSubmit} disabled={saving} style={{ gap: "6px" }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Wird angelegt...</> : <><Check size={14} /> MITGLIED ANLEGEN</>}
              </Button>
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── SHEET: Lead-Profil ────────────────────────────────────────────────────────
function LeadProfileSheet({ lead, staff, onClose, onSuccess, onConvert }: {
  lead: Lead | null;
  staff: StaffUser[];
  onClose: () => void;
  onSuccess: () => void;
  onConvert: (lead: Lead) => void;
}) {
  const [tab, setTab]             = useState<"kontakt" | "crm" | "notizen">("kontakt");
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [type, setType]           = useState<LeadType>("trial");
  const [goal, setGoal]           = useState<LeadGoal>("fitness");
  const [desiredDate, setDate]    = useState("");
  const [status, setStatus]       = useState<LeadStatus>("Neu");
  const [assignedTo, setAssigned] = useState("");
  const [lastContact, setLast]    = useState("");
  const [nextContact, setNext]    = useState("");
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!lead) return;
    setTab("kontakt");
    setName(lead.name);          setEmail(lead.email);
    setPhone(lead.phone ?? "");  setType(lead.type);
    setGoal(lead.goal);          setDate(lead.desiredDate ?? "");
    setStatus(lead.status);      setAssigned(lead.assigned_to ?? "");
    setLast(lead.last_contact ?? ""); setNext(lead.next_contact ?? "");
    setNotes(lead.notes ?? "");
  }, [lead]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setSaving(true);
    try {
      await api.admin.leads.update(lead.id, {
        name: name.trim(), email: email.trim(),
        phone: phone.trim() || null, type, goal, desiredDate,
        status,
        assigned_to: assignedTo || null,
        last_contact: lastContact || null,
        next_contact: nextContact || null,
        notes: notes.trim() || null,
      });
      toast.success("Lead aktualisiert.");
      onSuccess();
    } catch { /* via api-service */ } finally { setSaving(false); }
  };

  const TABS = [
    { id: "kontakt" as const, label: "Kontakt"  },
    { id: "crm"     as const, label: "CRM"      },
    { id: "notizen" as const, label: "Notizen"  },
  ];

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="!w-full !max-w-[520px] overflow-y-auto"
        style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>

        {/* ── Header ── */}
        <SheetHeader style={{ padding: "24px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{
              width: "44px", height: "44px", flexShrink: 0,
              background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UserIcon size={20} style={{ color: "var(--brand)" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <SheetTitle style={{
                fontFamily: "var(--font-display)", fontSize: "24px",
                letterSpacing: "0.04em", textTransform: "uppercase", color: "white", lineHeight: 1.1,
              }}>
                {lead?.name ?? "—"}
              </SheetTitle>
              <SheetDescription asChild>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                  <span style={{
                    display: "inline-flex", padding: "2px 8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
                  }}>
                    {lead ? nacLeadId(lead.id) : "—"}
                  </span>
                  {lead?.magicline_id && (
                    <span style={{
                      display: "inline-flex", padding: "2px 8px",
                      border: "1px solid rgba(202,12,133,0.4)", background: "rgba(202,12,133,0.08)",
                      fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.14em", color: "rgba(202,12,133,0.9)", textTransform: "uppercase",
                    }}>
                      ML {lead.magicline_id}
                    </span>
                  )}
                  {lead && <LeadStatusBadge status={lead.status} />}
                  {lead && <TypeBadge type={lead.type} />}
                </div>
              </SheetDescription>
            </div>
          </div>

          {/* Konvertier-Button prominent */}
          <button type="button" onClick={() => lead && onConvert(lead)}
            style={{
              marginTop: "14px", width: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "8px", padding: "11px",
              background: "var(--brand)", border: "none", cursor: "pointer", color: "white",
              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase", transition: "all 0.2s",
              boxShadow: "0 0 20px rgba(202,12,133,0.3)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = ""; }}
          >
            <UserPlus size={15} /> ZU MITGLIED KONVERTIEREN
          </button>
        </SheetHeader>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", margin: "18px 24px 0", gap: 0 }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
              padding: "9px 16px", background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: tab === t.id ? "white" : "rgba(255,255,255,0.35)",
              borderBottom: tab === t.id ? "2px solid var(--brand)" : "2px solid transparent",
              marginBottom: "-1px", transition: "color 0.15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab-Inhalt ── */}
        <form onSubmit={handleSave} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <AnimatePresence mode="wait">

              {/* KONTAKT */}
              {tab === "kontakt" && (
                <motion.div key="k" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <FieldLabel>Vollstaendiger Name *</FieldLabel>
                    <Input required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <FieldLabel>E-Mail *</FieldLabel>
                      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Telefon</FieldLabel>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 ..." />
                    </div>
                  </div>
                  {lead && (
                    <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: "4px" }}>Erstellt am</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* CRM */}
              {tab === "crm" && (
                <motion.div key="c" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <FieldLabel>Anfrage-Typ</FieldLabel>
                      <NacSelect value={type} onChange={(v) => setType(v as LeadType)}>
                        <option value="trial">Probetraining</option>
                        <option value="contact">Kontaktanfrage</option>
                      </NacSelect>
                    </div>
                    <div>
                      <FieldLabel>Trainingsziel</FieldLabel>
                      <NacSelect value={goal} onChange={(v) => setGoal(v as LeadGoal)}>
                        <option value="fitness">Allgemeine Fitness</option>
                        <option value="muskelaufbau">Muskelaufbau</option>
                        <option value="abnehmen">Abnehmen</option>
                        <option value="crossfit">CrossFit</option>
                      </NacSelect>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <FieldLabel>Wunschdatum</FieldLabel>
                      <Input type="date" value={desiredDate} onChange={(e) => setDate(e.target.value)} style={{ colorScheme: "dark" }} />
                    </div>
                    <div>
                      <FieldLabel>Status</FieldLabel>
                      <NacSelect value={status} onChange={(v) => setStatus(v as LeadStatus)}>
                        <option value="Neu">Neu</option>
                        <option value="Kontaktiert">Kontaktiert</option>
                        <option value="Bestätigt">Bestaetigt</option>
                        <option value="Abgesagt">Abgesagt</option>
                      </NacSelect>
                    </div>
                  </div>

                  {/* Trennlinie */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px" }}>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(202,12,133,0.6)", textTransform: "uppercase", marginBottom: "10px" }}>
                      Kontakt & Zuweisung
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <FieldLabel>Zugewiesen an</FieldLabel>
                        <NacSelect value={assignedTo} onChange={setAssigned}>
                          <option value="">Nicht zugewiesen</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.role && s.role !== "member" ? ` (${ROLE_LABELS[s.role] ?? s.role})` : ""}
                            </option>
                          ))}
                        </NacSelect>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <FieldLabel>Letzter Kontakt</FieldLabel>
                          <div style={{ position: "relative" }}>
                            <Calendar size={11} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.3)" }} />
                            <Input type="date" value={lastContact} onChange={(e) => setLast(e.target.value)}
                              style={{ colorScheme: "dark", paddingLeft: "28px" }} />
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Naechster Kontakt</FieldLabel>
                          <div style={{ position: "relative" }}>
                            <CalendarClock size={11} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: nextContact && isOverdue(nextContact) ? "#f87171" : "rgba(255,255,255,0.3)" }} />
                            <Input type="date" value={nextContact} onChange={(e) => setNext(e.target.value)}
                              style={{ colorScheme: "dark", paddingLeft: "28px", borderColor: nextContact && isOverdue(nextContact) ? "rgba(239,68,68,0.4)" : undefined }} />
                          </div>
                          {nextContact && isOverdue(nextContact) && (
                            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: "#f87171", textTransform: "uppercase", marginTop: "4px" }}>
                              Kontakt ueberfaellig!
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* NOTIZEN */}
              {tab === "notizen" && (
                <motion.div key="n" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <StickyNote size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                      Interne Notizen – nur fuer Admins sichtbar.
                    </p>
                  </div>
                  <textarea rows={10} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="z. B. Interessiert sich fuer CrossFit-Kurse, wartet auf Angebot..."
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
                      padding: "10px 12px", outline: "none", resize: "vertical", boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "10px" }}>
            <Button type="button" variant="outline" onClick={onClose} style={{ flexShrink: 0 }}>Schliessen</Button>
            <Button type="submit" disabled={saving} style={{ flex: 1, gap: "6px" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Speichern...</> : <><Save size={14} /> SPEICHERN</>}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ── MOBILE: Lead-Card ─────────────────────────────────────────────────────────
function LeadCard({ lead, onView, onConvert, onDelete }: {
  lead: Lead; onView: (l: Lead) => void; onConvert: (l: Lead) => void; onDelete: (l: Lead) => void;
}) {
  const overdueNext = lead.next_contact && isOverdue(lead.next_contact);
  const todayNext   = lead.next_contact && isToday(lead.next_contact);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: overdueNext ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.07)",
        padding: "14px 16px", transition: "border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em", color: "white", textTransform: "uppercase" }}>
              {lead.name}
            </p>
            {lead.magicline_id && <MlLeadBadge />}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            <LeadStatusBadge status={lead.status} />
            <TypeBadge type={lead.type} />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 border border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.06] hover:text-white">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", minWidth: "190px" }}>
            <DropdownMenuItem onClick={() => onView(lead)} style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
              Lead ansehen / bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onConvert(lead)} style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
              <UserPlus size={13} style={{ marginRight: "8px", color: "var(--brand)" }} /> Zu Mitglied konvertieren
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.07)" }} />
            <DropdownMenuItem onClick={() => onDelete(lead)} style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", color: "#f87171" }}>
              <Trash2 size={13} style={{ marginRight: "8px" }} /> Lead loeschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Kontakt */}
      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "3px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
          <Mail size={11} /> {lead.email}
        </span>
        {lead.phone && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            <Phone size={11} /> {lead.phone}
          </span>
        )}
      </div>

      {/* CRM-Zeile */}
      <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        {lead.assigned_to_name && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
            <UserCheck size={10} style={{ color: "rgba(202,12,133,0.7)" }} /> {lead.assigned_to_name}
          </span>
        )}
        {lead.next_contact && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-body)", fontSize: "11px", color: overdueNext ? "#f87171" : todayNext ? "#fbbf24" : "rgba(255,255,255,0.35)" }}>
            <CalendarClock size={10} />
            Next: {fmtDate(lead.next_contact)}
            {overdueNext && " (FAELLIG)"}
            {todayNext   && " (HEUTE)"}
          </span>
        )}
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", background: "rgba(255,255,255,0.04)", padding: "2px 6px" }}>
          {GOAL_LABELS[lead.goal] ?? lead.goal}
        </span>
      </div>
    </motion.div>
  );
}

// ── HAUPT-KOMPONENTE ──────────────────────────────────────────────────────────
export default function AdminLeads() {
  const location = useLocation();
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [staff, setStaff]   = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [profileLead, setProfileLead]   = useState<Lead | null>(null);
  const [convertLead, setConvertLead]   = useState<Lead | null>(null);
  const [deleteLead,  setDeleteLead]    = useState<Lead | null>(null);
  const [isSaving,    setIsSaving]      = useState(false);
  const [filterOpen,  setFilterOpen]    = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", type: "trial" as LeadType,
    goal: "fitness" as LeadGoal, desiredDate: new Date().toISOString().split("T")[0],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadData, staffData] = await Promise.allSettled([
        api.admin.leads.list(),
        api.admin.users.listStaff(),
      ]);
      if (leadData.status === "fulfilled") setLeads(leadData.value);
      if (staffData.status === "fulfilled") setStaff(staffData.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [location.key]);

  const filtered = useMemo(() => applyFilters(leads, filters), [leads, filters]);

  // Stats fuer den Ueberblick
  const stats = useMemo(() => ({
    total:   leads.length,
    neu:     leads.filter(l => l.status === "Neu").length,
    overdue: leads.filter(l => l.next_contact && isOverdue(l.next_contact)).length,
  }), [leads]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.admin.leads.create({ ...formData, status: "Neu", notes: null, magicline_id: null, assigned_to: null, last_contact: null, next_contact: null });
      toast.success("Lead erfolgreich angelegt");
      setIsCreateOpen(false);
      setFormData({ name: "", email: "", phone: "", type: "trial", goal: "fitness", desiredDate: new Date().toISOString().split("T")[0] });
      loadData();
    } catch {
      toast.error("Fehler beim Erstellen des Leads");
    } finally { setIsSaving(false); }
  };

  function KebabMenu({ lead }: { lead: Lead }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 border border-white/[0.07] bg-transparent hover:bg-white/[0.06] text-white/40 hover:text-white">
            <MoreVertical size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", minWidth: "200px" }}>
          <DropdownMenuItem onClick={() => setProfileLead(lead)} style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
            Lead ansehen / bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConvertLead(lead)} style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
            <UserPlus size={13} style={{ marginRight: "8px", color: "var(--brand)" }} /> Zu Mitglied konvertieren
          </DropdownMenuItem>
          <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.07)" }} />
          <DropdownMenuItem onClick={() => setDeleteLead(lead)} style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", color: "#f87171" }}>
            <Trash2 size={13} style={{ marginRight: "8px" }} /> Lead loeschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h2 className="text-white font-display text-4xl italic tracking-tighter uppercase">
            LEAD <span className="text-brand">MANAGEMENT</span>
          </h2>
          <p className="text-white/30 text-sm">Interessenten und Probetrainings verwalten</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="font-bold" style={{ gap: "8px", minHeight: "44px" }}>
          <Plus size={18} /> NEUER LEAD
        </Button>
      </div>

      {/* ── KPI-Karten (identisches Layout wie AdminMembers) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
        {[
          { label: "Gesamt",    value: stats.total,        color: "rgba(255,255,255,0.7)" },
          { label: "Neu",       value: stats.neu,          color: "#60a5fa"               },
          { label: "Faellig",   value: stats.overdue,      color: stats.overdue > 0 ? "#f87171" : "rgba(255,255,255,0.3)" },
          { label: "Gefiltert", value: filtered.length,    color: "rgba(255,255,255,0.5)" },
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

      {/* ── Suche & Filter (identischer Stil wie AdminMembers) ── */}
      <div className="space-y-3">
        {/* Zeile 1: Suche + Filter-Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Search – exakt wie AdminMembers */}
          <div style={{ position: "relative", maxWidth: "400px", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
            <Input
              placeholder="Name, E-Mail oder Telefon..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              style={{ paddingLeft: "36px" }}
            />
            <AnimatePresence>
              {filters.search && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setFilters(f => ({ ...f, search: "" }))}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "2px" }}
                >
                  <X size={13} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Filter-Toggle */}
          <button
            onClick={() => setFilterOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "0 14px", height: "40px",
              background: filterOpen ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.04)",
              border: filterOpen ? "1px solid rgba(202,12,133,0.4)" : "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              color: filterOpen ? "rgba(202,12,133,0.9)" : "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase", transition: "all 0.2s", flexShrink: 0,
            }}
          >
            <Filter size={12} />
            Filter
            {countActiveFilters(filters) > 0 && (
              <span style={{ background: "var(--brand)", color: "white", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 700, lineHeight: 1.4 }}>
                {countActiveFilters(filters)}
              </span>
            )}
          </button>

          {countActiveFilters(filters) > 0 && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "0 12px", height: "40px",
                background: "none", border: "1px solid rgba(239,68,68,0.25)",
                cursor: "pointer", color: "rgba(239,68,68,0.7)",
                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.15s", flexShrink: 0,
              }}
            >
              <X size={10} /> Zuruecksetzen
            </button>
          )}
        </div>

        {/* Zeile 2: Erweiterter Filter-Panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              key="fp"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                padding: "14px 16px", background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px",
              }}>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <NacSelect value={filters.status} onChange={(v) => setFilters(f => ({ ...f, status: v as LeadStatus | "" }))}>
                    <option value="">Alle Status</option>
                    <option value="Neu">Neu</option>
                    <option value="Kontaktiert">Kontaktiert</option>
                    <option value="Bestätigt">Bestaetigt</option>
                    <option value="Abgesagt">Abgesagt</option>
                  </NacSelect>
                </div>
                <div>
                  <FieldLabel>Anfrage-Typ</FieldLabel>
                  <NacSelect value={filters.type} onChange={(v) => setFilters(f => ({ ...f, type: v as LeadType | "" }))}>
                    <option value="">Alle Typen</option>
                    <option value="trial">Probetraining</option>
                    <option value="contact">Kontaktanfrage</option>
                  </NacSelect>
                </div>
                <div>
                  <FieldLabel>Trainingsziel</FieldLabel>
                  <NacSelect value={filters.goal} onChange={(v) => setFilters(f => ({ ...f, goal: v as LeadGoal | "" }))}>
                    <option value="">Alle Ziele</option>
                    <option value="fitness">Allgemeine Fitness</option>
                    <option value="muskelaufbau">Muskelaufbau</option>
                    <option value="abnehmen">Abnehmen</option>
                    <option value="crossfit">CrossFit</option>
                  </NacSelect>
                </div>
                <div>
                  <FieldLabel>Zugewiesen an</FieldLabel>
                  <NacSelect value={filters.assignedTo} onChange={(v) => setFilters(f => ({ ...f, assignedTo: v }))}>
                    <option value="">Alle Mitarbeiter</option>
                    <option value="none">Nicht zugewiesen</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </NacSelect>
                </div>
                <div>
                  <FieldLabel>Naechster Kontakt</FieldLabel>
                  <NacSelect value={filters.nextContactRange} onChange={(v) => setFilters(f => ({ ...f, nextContactRange: v as LeadFilters["nextContactRange"] }))}>
                    <option value="all">Alle</option>
                    <option value="overdue">Ueberfaellig</option>
                    <option value="today">Heute</option>
                    <option value="week">Diese Woche</option>
                    <option value="none">Kein Datum</option>
                  </NacSelect>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop-Tabelle ── */}
      <div className="hidden md:block">
        <DataTable loading={loading} data={filtered} keyField="id" columns={[
          {
            key: "name", header: "Name",
            cell: (r) => (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "white" }}>{r.name}</span>
                  {r.magicline_id && <MlLeadBadge />}
                </div>
                <TypeBadge type={r.type} />
              </div>
            ),
          },
          {
            key: "email", header: "Kontakt",
            cell: (r) => (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                  <Mail size={10} /> {r.email}
                </span>
                {r.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                    <Phone size={10} /> {r.phone}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "goal", header: "Ziel",
            cell: (r) => (
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", background: "rgba(255,255,255,0.04)", padding: "2px 8px" }}>
                {GOAL_LABELS[r.goal] ?? r.goal}
              </span>
            ),
          },
          {
            key: "status", header: "Status",
            cell: (r) => <LeadStatusBadge status={r.status} />,
          },
          {
            key: "assigned_to", header: "Zugewiesen an",
            cell: (r) => <AssignedBadge name={r.assigned_to_name} />,
          },
          {
            key: "last_contact", header: "Letzter Kontakt",
            cell: (r) => r.last_contact
              ? <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{fmtDate(r.last_contact)}</span>
              : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>—</span>,
          },
          {
            key: "next_contact", header: "Naechster Kontakt",
            cell: (r) => <NextContactBadge date={r.next_contact} />,
          },
          {
            key: "actions", header: "",
            cell: (r) => <KebabMenu lead={r} />,
          },
        ]} />
      </div>

      {/* ── Mobile-Cards ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={22} className="animate-spin" style={{ color: "var(--brand)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>
              Keine Leads entsprechen den aktiven Filtern.
            </p>
            {countActiveFilters(filters) > 0 && (
              <button onClick={() => setFilters(EMPTY_FILTERS)} style={{ marginTop: "12px", background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "8px 16px", cursor: "pointer", fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Filter zuruecksetzen
              </button>
            )}
          </div>
        ) : filtered.map((lead) => (
          <LeadCard key={lead.id} lead={lead}
            onView={setProfileLead} onConvert={setConvertLead} onDelete={setDeleteLead} />
        ))}
      </div>

      {/* ── DIALOG: Neuer Lead ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "480px" }}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Plus size={18} style={{ color: "var(--brand)" }} />
              <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
                Lead manuell erfassen
              </DialogTitle>
            </div>
            <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
              Fuege einen neuen Interessenten direkt in die Datenbank ein.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "8px" }}>
            <div>
              <FieldLabel>Vollstaendiger Name *</FieldLabel>
              <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <FieldLabel>E-Mail *</FieldLabel>
                <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Telefon</FieldLabel>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <FieldLabel>Anfrage-Typ</FieldLabel>
                <NacSelect value={formData.type} onChange={(v) => setFormData({ ...formData, type: v as LeadType })}>
                  <option value="trial">Probetraining</option>
                  <option value="contact">Kontaktanfrage</option>
                </NacSelect>
              </div>
              <div>
                <FieldLabel>Trainingsziel</FieldLabel>
                <NacSelect value={formData.goal} onChange={(v) => setFormData({ ...formData, goal: v as LeadGoal })}>
                  <option value="fitness">Allgemeine Fitness</option>
                  <option value="muskelaufbau">Muskelaufbau</option>
                  <option value="abnehmen">Abnehmen</option>
                  <option value="crossfit">CrossFit</option>
                </NacSelect>
              </div>
            </div>
            <div>
              <FieldLabel>Wunschdatum</FieldLabel>
              <Input type="date" value={formData.desiredDate} onChange={(e) => setFormData({ ...formData, desiredDate: e.target.value })} style={{ colorScheme: "dark" }} />
            </div>
            <DialogFooter style={{ paddingTop: "4px" }}>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>Abbrechen</Button>
              <Button type="submit" disabled={isSaving} style={{ gap: "6px" }}>
                {isSaving ? <><Loader2 size={14} className="animate-spin" /> Speichern...</> : "LEAD ANLEGEN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SHEET / DIALOGE ── */}
      <LeadProfileSheet
        lead={profileLead} staff={staff}
        onClose={() => setProfileLead(null)}
        onSuccess={() => { setProfileLead(null); loadData(); }}
        onConvert={(l) => { setProfileLead(null); setConvertLead(l); }}
      />
      <ConvertLeadDialog
        lead={convertLead}
        onClose={() => setConvertLead(null)}
        onSuccess={() => { setConvertLead(null); loadData(); }}
      />
      <DeleteLeadDialog
        lead={deleteLead}
        onClose={() => setDeleteLead(null)}
        onSuccess={loadData}
      />
    </div>
  );
}

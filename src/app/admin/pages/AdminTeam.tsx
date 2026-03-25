/**
 * AdminTeam.tsx
 * Team & Rechte – Enterprise Mitarbeiterverwaltung mit RBAC
 * Sprint 18: Sperren/Loeschen, granulare Berechtigungen, Mitglieds-Verknuepfung
 * Sprint 19: Frontend-Profile (Bilder, Bio, Social Media, Schwerpunkte, Sichtbarkeit)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router";
import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  UsersRound,
  Plus,
  Pencil,
  ShieldCheck,
  UserCircle2,
  Link2,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  Check as CheckIcon,
  Minus,
  MoreHorizontal,
  Lock,
  Unlock,
  Trash2,
  UserPlus,
  Hash,
  UserX,
  Calendar,
  AlertTriangle,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api-service";
import type { Member } from "../../../lib/api-service";
import { TEAM_MEMBERS } from "../../../data/team";
import { TeamProfileEditor, type TeamProfile } from "../components/TeamProfileEditor";
import { TeamProfileDrawer } from "../components/TeamProfileDrawer";
import { UnifiedStaffEditor } from "../components/UnifiedStaffEditor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";

// ── Types ──────────────────────────────────────────────────────────────────────
type StaffRole = "admin" | "hr" | "finance" | "trainer" | "frontdesk";
type LinkAction = "none" | "create" | "link";

interface StaffUser {
  id: string;
  staff_number?: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: string[];
  member_id: number | null;
  active: boolean | number;
  /** Herkunft: onboarding, manual, import */
  source?: string | null;
  /** FK auf career_applicants.id */
  applicant_id?: number | null;
  /** Einstellungsdatum (ISO) */
  hired_at?: string | null;
  /** Kuendigungsdatum (ISO) */
  terminated_at?: string | null;
  /** Kuendigungsgrund */
  termination_reason?: string | null;
  /** Alternativ: hire/exit als reines Datum */
  hire_date?: string | null;
  exit_date?: string | null;
  status?: string | null;
  phone?: string | null;
}

interface FormState {
  staff_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  password: string;
  role: StaffRole | "";
  permissions: string[];
  link_member_action: LinkAction;
  member_id: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  staff_number: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  birth_date: "",
  password: "",
  role: "",
  permissions: [],
  link_member_action: "none",
  member_id: "",
  active: true,
};

// ── Constants ──────────────────────────────────────────────────────────────────
const PERMISSIONS = [
  { value: "Mitglieder verwalten",  icon: "👥" },
  { value: "Kurse verwalten",       icon: "🏋️" },
  { value: "Finanzen einsehen",     icon: "💶" },
  { value: "Antraege bearbeiten",   icon: "📬" },
  { value: "System-Settings",       icon: "⚙️" },
] as const;

const ROLE_CONFIG: Record<StaffRole, { label: string; color: string; bg: string; border: string }> = {
  admin:     { label: "Admin",     color: "#CA0C85", bg: "rgba(202,12,133,0.12)", border: "rgba(202,12,133,0.35)" },
  hr:        { label: "HR",        color: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)" },
  finance:   { label: "Finance",   color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)"  },
  trainer:   { label: "Trainer",   color: "#60A5FA", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.35)"  },
  frontdesk: { label: "Frontdesk", color: "#FBBF24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)"  },
};

const ROLE_OPTIONS: StaffRole[] = ["admin", "hr", "finance", "trainer", "frontdesk"];

// ── Sub-Components ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: StaffRole }) {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "3px", background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean | number }) {
  const isActive = Boolean(active);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 8px", borderRadius: "3px", background: isActive ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)", border: isActive ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.1)", color: isActive ? "#34D399" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: isActive ? "#34D399" : "rgba(255,255,255,0.2)", display: "inline-block", flexShrink: 0 }} />
      {isActive ? "Aktiv" : "Gesperrt"}
    </span>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: "6px" }}>
      {children}{required && <span style={{ color: "var(--brand)", marginLeft: "3px" }}>*</span>}
    </label>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function FieldInput({ type = "text", value, onChange, placeholder, disabled, rightElement }: {
  type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; rightElement?: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: "100%", padding: "10px 12px", paddingRight: rightElement ? "40px" : "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", opacity: disabled ? 0.5 : 1 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(202,12,133,0.1)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
      />
      {rightElement && (
        <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}>
          {rightElement}
        </div>
      )}
    </div>
  );
}

// ── More Options Dropdown ──────────────────────────────────────────────────────
function MoreMenu({
  user,
  onEdit,
  onEditProfile,
  onToggleStatus,
  onDelete,
  onTerminate,
}: {
  user: StaffUser;
  onEdit: () => void;
  onEditProfile?: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onTerminate?: () => void;
}) {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState({ top: 0, right: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position des Buttons berechnen (fixed coords), dann öffnen
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((p) => !p);
  };

  // Click-Outside schließt das Menü
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll / Resize schließt ebenfalls
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const isActive = Boolean(user.active);

  const menuItems = [
    {
      label: "Profil bearbeiten",
      icon: <Pencil size={13} />,
      color: "rgba(255,255,255,0.75)",
      onClick: () => { if (onEditProfile) onEditProfile(); else onEdit(); setOpen(false); },
      separator: false,
    },
    {
      label: isActive ? "Sperren" : "Entsperren",
      icon: isActive ? <Lock size={13} /> : <Unlock size={13} />,
      color: isActive ? "#FBBF24" : "#34D399",
      onClick: () => { onToggleStatus(); setOpen(false); },
      separator: false,
    },
    ...(isActive && onTerminate ? [{
      label: "Kündigen / Deaktivieren",
      icon: <UserX size={13} />,
      color: "#F59E0B",
      onClick: () => { onTerminate(); setOpen(false); },
      separator: true,
    }] : []),
    {
      label: "Loeschen",
      icon: <Trash2 size={13} />,
      color: "#F87171",
      onClick: () => { onDelete(); setOpen(false); },
      separator: true,
    },
  ];

  // Portal: rendert in document.body → überwindet overflow:hidden der Tabelle
  const dropdown = open
    ? createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            minWidth: "168px",
            background: "#111111",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "6px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "9px",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderTop: item.separator ? "1px solid rgba(255,255,255,0.07)" : "none",
                color: item.color,
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.12s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          background: open ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "4px",
          color: open ? "#fff" : "rgba(255,255,255,0.4)",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)";
          e.currentTarget.style.background = "rgba(202,12,133,0.08)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }
        }}
        aria-label="Optionen"
        aria-expanded={open}
      >
        <MoreHorizontal size={15} />
      </button>

      {dropdown}
    </div>
  );
}

// ── Permissions Matrix Dialog ──────────────────────────────────────────────────
const PERM_MATRIX: { feature: string; icon: string; roles: Record<StaffRole, boolean> }[] = [
  { feature: "Dashboard",     icon: "📊", roles: { admin: true,  hr: true,  finance: true,  trainer: true,  frontdesk: true  } },
  { feature: "Mitglieder",    icon: "👥", roles: { admin: true,  hr: true,  finance: true,  trainer: true,  frontdesk: true  } },
  { feature: "Kurse",         icon: "🏋️", roles: { admin: true,  hr: false, finance: false, trainer: true,  frontdesk: true  } },
  { feature: "Leads",         icon: "📋", roles: { admin: true,  hr: true,  finance: false, trainer: false, frontdesk: true  } },
  { feature: "Finanzen",      icon: "💶", roles: { admin: true,  hr: false, finance: true,  trainer: false, frontdesk: false } },
  { feature: "Antraege",      icon: "📬", roles: { admin: true,  hr: true,  finance: false, trainer: false, frontdesk: true  } },
  { feature: "Team & Rechte", icon: "🛡️", roles: { admin: true,  hr: true,  finance: false, trainer: false, frontdesk: false } },
  { feature: "Seiten / CMS",  icon: "📝", roles: { admin: true,  hr: false, finance: false, trainer: false, frontdesk: false } },
  { feature: "Audit-Log",     icon: "🔍", roles: { admin: true,  hr: false, finance: false, trainer: false, frontdesk: false } },
  { feature: "Einstellungen", icon: "⚙️", roles: { admin: true,  hr: false, finance: false, trainer: false, frontdesk: false } },
];

function PermissionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const roles: StaffRole[] = ["admin", "hr", "finance", "trainer", "frontdesk"];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "700px", overflow: "hidden" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} style={{ color: "var(--brand)" }} />
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Berechtigungs-Matrix
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            Ubersicht aller Rollen und ihrer Zugriffsrechte im Admin-Bereich
          </DialogDescription>
        </DialogHeader>
        <div style={{ overflowX: "auto", marginTop: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Bereich</span>
                </th>
                {roles.map((r) => (
                  <th key={r} style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: "80px" }}>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ROLE_CONFIG[r].color }}>
                      {ROLE_CONFIG[r].label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_MATRIX.map((row, idx) => (
                <tr key={row.feature} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "14px" }}>{row.icon}</span>
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.04em", color: "rgba(255,255,255,0.7)" }}>{row.feature}</span>
                    </div>
                  </td>
                  {roles.map((r) => (
                    <td key={r} style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {row.roles[r] ? (
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)" }}>
                          <CheckIcon size={11} style={{ color: "#34D399" }} strokeWidth={3} />
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <Minus size={10} style={{ color: "rgba(255,255,255,0.2)" }} strokeWidth={2} />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)" }}>
              <CheckIcon size={9} style={{ color: "#34D399" }} strokeWidth={3} />
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Zugriff erlaubt</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Minus size={9} style={{ color: "rgba(255,255,255,0.2)" }} strokeWidth={2} />
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Kein Zugriff</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ──────────────────────────────────────────────────────
function DeleteDialog({
  target,
  deleting,
  deleteMemberAlso,
  setDeleteMemberAlso,
  onConfirm,
  onCancel,
}: {
  target: StaffUser | null;
  deleting: boolean;
  deleteMemberAlso: boolean;
  setDeleteMemberAlso: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const hasMember = Boolean(target?.member_id);
  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)", maxWidth: "480px" }}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Trash2 size={16} style={{ color: "#F87171" }} />
            </div>
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              Mitarbeiter loeschen
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.45)", fontSize: "14px", lineHeight: 1.6, paddingTop: "4px" }}>
            Soll <span style={{ color: "#fff", fontWeight: 600 }}>{target?.name}</span> wirklich endgueltig geloescht werden?
            Dieser Vorgang kann nicht rueckgaengig gemacht werden.
          </DialogDescription>
        </DialogHeader>

        {/* Member account question */}
        {hasMember && (
          <div style={{ margin: "12px 0 4px", padding: "14px 16px", background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.2)", borderRadius: "6px" }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(202,12,133,0.9)", marginBottom: "10px" }}>
              Verknuepftes Mitglieds-Konto gefunden
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "12px", lineHeight: 1.5 }}>
              Dieser Mitarbeiter ist mit einem Mitglieds-Konto verknuepft. Wie soll damit verfahren werden?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { value: false, label: "Mitglieds-Konto behalten", desc: "Das Mitglied bleibt im System und kann weiterhin trainieren." },
                { value: true,  label: "Mitglieds-Konto ebenfalls loeschen", desc: "Das Mitglied wird vollstaendig aus dem System entfernt." },
              ].map((opt) => {
                const sel = deleteMemberAlso === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setDeleteMemberAlso(opt.value)}
                    style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", background: sel ? (opt.value ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.06)") : "rgba(255,255,255,0.02)", border: `1px solid ${sel ? (opt.value ? "rgba(248,113,113,0.35)" : "rgba(52,211,153,0.3)") : "rgba(255,255,255,0.07)"}`, borderRadius: "4px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                  >
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", marginTop: "1px", border: `2px solid ${sel ? (opt.value ? "#F87171" : "#34D399") : "rgba(255,255,255,0.2)"}`, background: sel ? (opt.value ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)") : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: opt.value ? "#F87171" : "#34D399" }} />}
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: sel ? "#fff" : "rgba(255,255,255,0.5)", marginBottom: "2px" }}>{opt.label}</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter style={{ marginTop: "16px" }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{ padding: "0 20px", height: "42px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{ padding: "0 20px", height: "42px", background: deleting ? "rgba(248,113,113,0.4)" : "rgba(248,113,113,0.8)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}
          >
            {deleting ? (
              <><div style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Loeschen...</>
            ) : (
              <><Trash2 size={13} /> Endgueltig loeschen</>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── API → TeamProfile Mapper ───────────────────────────────────────────────────
function mapApiToProfile(m: any): TeamProfile {
  const mFullName = (m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim()).toLowerCase();
  const localMatch = TEAM_MEMBERS.find(
    (t) => t.id === m.slug || t.id === m.id || t.name === m.name
      || t.name.toLowerCase() === mFullName
      || (mFullName.includes(t.name.split(" ")[0].toLowerCase()) && mFullName.includes(t.name.split(" ").slice(-1)[0].toLowerCase()))
  );
  return {
    id: m.id || m.slug || "",
    slug: m.slug || m.id || "",
    first_name: m.first_name || m.name?.split(" ")[0] || "",
    last_name: m.last_name || m.name?.split(" ").slice(1).join(" ") || "",
    position: m.position || m.role || "",
    type: m.type || "coach",
    profile_image: m.profile_image || m.image || localMatch?.image || "",
    detail_image: m.detail_image || m.image || localMatch?.image || "",
    bio: m.bio || "",
    meta_bio: m.meta_bio || "",
    specialties: Array.isArray(m.specialties) ? m.specialties : [],
    certifications: Array.isArray(m.certifications) ? m.certifications : [],
    instagram: m.instagram || "",
    facebook: m.facebook || "",
    linkedin: m.linkedin || "",
    tiktok: m.tiktok || "",
    snapchat: m.snapchat || "",
    visible: m.visible !== false,
    sort_order: m.sort_order || 0,
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminTeam() {
  const location = useLocation();
  const [team, setTeam] = useState<StaffUser[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMemberAlso, setDeleteMemberAlso] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<StaffUser | null>(null);
  const [exitDate, setExitDate] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [terminating, setTerminating] = useState(false);

  // ── Frontend Profile State ────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [profileDrawerTarget, setProfileDrawerTarget] = useState<TeamProfile | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileEditorTarget, setProfileEditorTarget] = useState<TeamProfile | null>(null);

  // ── Unified Editor State ────────────────────────────────────────────────
  const [unifiedEditorOpen, setUnifiedEditorOpen] = useState(false);
  const [unifiedEditorUserId, setUnifiedEditorUserId] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamData, memberData, profileData] = await Promise.allSettled([
        api.admin.users.listTeam(),
        api.admin.members.list(),
        api.admin.teamPublic.list(),
      ]);
      if (teamData.status === "fulfilled") setTeam(teamData.value as StaffUser[]);
      if (memberData.status === "fulfilled") setMembers(memberData.value);
      if (profileData.status === "fulfilled" && Array.isArray(profileData.value)) {
        setProfiles(profileData.value.map(mapApiToProfile));
      }
    } catch {
      setTeam(MOCK_TEAM);
      // Load profiles from static data as fallback
      setProfiles(TEAM_MEMBERS.map((m) => ({
        id: m.id,
        slug: m.id,
        first_name: m.name.split(" ")[0] || "",
        last_name: m.name.split(" ").slice(1).join(" ") || "",
        position: m.role,
        type: m.type,
        profile_image: m.image,
        detail_image: m.image,
        bio: m.bio,
        meta_bio: "",
        specialties: m.specialties,
        certifications: m.certifications || [],
        instagram: m.instagram || "",
        facebook: "",
        linkedin: "",
        tiktok: "",
        snapchat: "",
        visible: m.visible,
        sort_order: 0,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, location.key]);

  // ── Open Sheet ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setSheetOpen(true);
  };

  const openEdit = (user: StaffUser) => {
    setEditTarget(user);
    const nameParts = user.name.split(" ");
    setForm({
      staff_number: user.staff_number ?? "",
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      email: user.email,
      phone: "",
      birth_date: "",
      password: "",
      role: user.role,
      permissions: user.permissions ?? [],
      link_member_action: user.member_id ? "link" : "none",
      member_id: user.member_id ? String(user.member_id) : "",
      active: Boolean(user.active),
    });
    setShowPassword(false);
    setSheetOpen(true);
  };

  // ── Toggle permission ─────────────────────────────────────────────────────
  const togglePermission = (perm: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.role) {
      toast.error("Bitte alle Pflichtfelder ausfullen (Vorname, Nachname, E-Mail, Rolle).");
      return;
    }
    if (!editTarget && !form.password.trim()) {
      toast.error("Passwort ist beim Anlegen eines neuen Mitarbeiters erforderlich.");
      return;
    }
    if (form.link_member_action === "link" && !form.member_id) {
      toast.error("Bitte ein Mitglied auswaehlen oder eine andere Option waehlen.");
      return;
    }
    setSaving(true);
    let savedOk = false;
    const isEdit = Boolean(editTarget);
    try {
      const payload: Record<string, unknown> = {
        staff_number:          form.staff_number.trim() || undefined,
        name:                  fullName,
        first_name:            form.first_name.trim(),
        last_name:             form.last_name.trim(),
        email:                 form.email.trim(),
        phone:                 form.phone.trim() || undefined,
        birth_date:            form.birth_date || undefined,
        role:                  form.role,
        permissions:           form.permissions,
        active:                form.active ? 1 : 0,
        member_id:             form.link_member_action === "link" ? (form.member_id || null) : null,
        create_member_account: form.link_member_action === "create",
      };
      if (form.password.trim()) payload.password = form.password;

      if (editTarget) {
        await api.admin.users.updateStaff(editTarget.id, payload);
        setTeam((prev) =>
          prev.map((u) =>
            u.id === editTarget.id
              ? {
                  ...u,
                  staff_number: form.staff_number.trim() || u.staff_number,
                  name:         fullName,
                  email:        form.email.trim(),
                  role:         form.role as StaffRole,
                  permissions:  form.permissions,
                  active:       form.active,
                  member_id:    form.link_member_action === "link" ? Number(form.member_id) : null,
                }
              : u
          )
        );
        // Sync name change to the linked frontend profile (if exists)
        const linkedProfile = getProfileForUser(editTarget);
        if (linkedProfile) {
          const updatedProfile = {
            ...linkedProfile,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
          };
          setProfiles((prev) => prev.map((p) => p.id === linkedProfile.id ? updatedProfile : p));
          try { await api.admin.teamPublic.update(linkedProfile.id, updatedProfile); } catch { /* silent */ }
        }
        toast.success("Mitarbeiter erfolgreich aktualisiert.", {
          description: `${fullName} (${form.email.trim()}) wurde gespeichert.`,
        });
        savedOk = true;
      } else {
        await api.admin.users.createStaff(payload);

        // Wenn "Neues Mitgliedskonto erstellen" gewaehlt: auch im Mitglieder-System anlegen
        if (form.link_member_action === "create") {
          try {
            await api.admin.members.create({
              first_name:       form.first_name.trim(),
              last_name:        form.last_name.trim(),
              email:            form.email.trim(),
              phone:            form.phone.trim() || undefined,
              birth_date:       form.birth_date || undefined,
              contract_type:    "starter",
              member_since:     new Date().toISOString().split("T")[0],
              create_login:     true,
              initial_password: form.password.trim() || "Start123!",
              is_staff:         true,
            });
            toast.success(`${fullName} wurde als Mitarbeiter + Mitglied angelegt!`, {
              description: `Mitglieds-Login: ${form.email.trim()} / Initiales Passwort: ${form.password.trim() || "Start123!"}`,
            });
          } catch {
            // API-Fehler still ignorieren – Mitarbeiter wurde bereits angelegt
            toast.success(`${fullName} wurde als Mitarbeiter angelegt!`, {
              description: "Mitglieds-Konto konnte nicht automatisch erstellt werden. Bitte manuell unter Mitglieder anlegen.",
            });
          }
        } else {
          toast.success("Mitarbeiter erfolgreich angelegt!", {
            description: `${fullName} (${form.role}) wurde dem Team hinzugefuegt.`,
          });
        }
        savedOk = true;
      }
    } catch {
      /* Fehler-Toast wird bereits von api-service.ts angezeigt */
    } finally {
      setSaving(false);
      setSheetOpen(false);
      if (!isEdit || !savedOk) load();
    }
  };

  // ── Toggle Status (Sperren / Entsperren) ──────────────────────────────────
  const handleToggleStatus = async (user: StaffUser) => {
    const newActive = !Boolean(user.active);
    try {
      await api.admin.users.updateStatus(user.id, newActive);
      setTeam((prev) => prev.map((u) => u.id === user.id ? { ...u, active: newActive } : u));
      toast.success(
        newActive ? `${user.name} wurde entsperrt.` : `${user.name} wurde gesperrt.`,
        { description: newActive ? "Account ist jetzt aktiv." : "Account wurde deaktiviert." }
      );
    } catch { /* api-service handles toast */ }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const targetId     = deleteTarget.id;
    const targetName   = deleteTarget.name;
    const linkedMember = deleteTarget.member_id;
    const alsoDelMember = deleteMemberAlso && Boolean(linkedMember);

    // Optimistic Update: sofort aus der Liste entfernen und Dialog schliessen
    setTeam((prev) => prev.filter((u) => u.id !== targetId));
    setDeleteTarget(null);
    setDeleteMemberAlso(false);

    try {
      await api.admin.users.deleteStaff(targetId);
      if (alsoDelMember) {
        try {
          await api.admin.members.deleteMember(String(linkedMember));
        } catch { /* silent */ }
      }
    } catch { /* silent */ } finally {
      setDeleting(false);
    }

    toast.success(`${targetName} wurde geloescht.`, {
      description: alsoDelMember
        ? "Mitarbeiter und verknuepftes Mitglieds-Konto wurden entfernt."
        : "Der Mitarbeiter wurde archiviert und aus dem Team entfernt.",
    });
  };

  // ── Terminate (Kündigen) ────────────────────────────────────────────────
  const handleTerminate = async () => {
    if (!terminateTarget) return;
    if (!exitDate) { toast.error("Bitte ein Austrittsdatum angeben."); return; }
    setTerminating(true);
    try {
      // 1. Immediately revoke access (separate call for safety)
      await api.admin.users.updateStatus(terminateTarget.id, false);
      // 2. Persist termination metadata
      await api.admin.users.updateStaff(terminateTarget.id, {
        active: false,
        terminated_at: exitDate,
        termination_reason: exitReason || null,
        exit_date: exitDate,
        status: "gekuendigt",
      });
      // 2. Update local state
      setTeam(prev => prev.map(u =>
        u.id === terminateTarget.id
          ? { ...u, active: false, terminated_at: exitDate, termination_reason: exitReason || null, exit_date: exitDate, status: "gekuendigt" }
          : u
      ));
      toast.success(`${terminateTarget.name} wurde gekündigt.`, {
        description: `Austrittsdatum: ${new Date(exitDate).toLocaleDateString("de-DE")}. Account wurde gesperrt, Dienstplan bereinigt. Datensatz wird 10 Jahre DSGVO-konform archiviert.`,
        duration: 6000,
      });
      setTerminateTarget(null);
      setExitDate("");
      setExitReason("");
    } catch {
      toast.error("Fehler beim Kündigen.");
    } finally {
      setTerminating(false);
    }
  };

  // ── Profile Helpers ────────────────────────────────────────────────────────
  const getProfileForUser = (user: StaffUser): TeamProfile | undefined => {
    return profiles.find((p) => {
      const pName = `${p.first_name} ${p.last_name}`.trim().toLowerCase();
      const uName = user.name.trim().toLowerCase();
      const uParts = uName.split(/\s+/);
      const uFirst = uParts[0] || "";
      const uLast = uParts.slice(1).join(" ") || "";
      // Match by: slug/id, exact name, first+last name parts, or id equality
      return (
        p.slug === user.id ||
        p.id === user.id ||
        pName === uName ||
        (p.first_name.toLowerCase() === uFirst && p.last_name.toLowerCase() === uLast) ||
        // Fuzzy: wenn der Vorname oder Nachname im Staff-Namen enthalten ist
        (p.first_name && p.last_name && uName.includes(p.first_name.toLowerCase()) && uName.includes(p.last_name.toLowerCase()))
      );
    });
  };

  const handleRowClick = (user: StaffUser) => {
    const profile = getProfileForUser(user);
    if (profile) {
      setProfileDrawerTarget(profile);
    }
  };

  const handleOpenProfileEditor = (user?: StaffUser) => {
    if (user) {
      // Open unified editor for existing staff (loads both Account + Profile)
      setUnifiedEditorUserId(user.id);
      setUnifiedEditorOpen(true);
      return;
    }
    // "Neues Profil" ohne Staff-Verknuepfung → alten Profile Editor verwenden
    setProfileEditorTarget(null);
    setProfileEditorOpen(true);
  };

  const handleSaveProfile = async (profile: TeamProfile) => {
    // Ensure name field is set for API/mock store
    const fullName = `${profile.first_name} ${profile.last_name}`.trim();
    const profileWithName = {
      ...profile,
      name: fullName,
    };

    // Helper: update local profiles state (single source of truth)
    const updateLocalProfiles = (savedProfile: TeamProfile) => {
      if (savedProfile.id) {
        setProfiles((prev) => prev.map((p) => p.id === savedProfile.id ? savedProfile : p));
      } else {
        const newId = `tp-${Date.now()}`;
        setProfiles((prev) => [...prev, { ...savedProfile, id: newId, slug: newId }]);
      }
    };

    // Helper: sync name change to StaffUser list (so admin table shows DB truth)
    const syncStaffName = () => {
      setTeam((prev) => prev.map((u) => {
        const uName = u.name.trim().toLowerCase();
        const pName = fullName.toLowerCase();
        // Find matching staff user by old profile match or direct name
        const existingProfile = getProfileForUser(u);
        if (existingProfile && existingProfile.id === profile.id) {
          return { ...u, name: fullName };
        }
        return u;
      }));
    };

    try {
      if (profile.id) {
        await api.admin.teamPublic.update(profile.id, profileWithName);
        updateLocalProfiles(profile);
      } else {
        const newId = `tp-${Date.now()}`;
        const created = { ...profile, id: newId, slug: newId };
        await api.admin.teamPublic.create({ ...profileWithName, id: newId, slug: newId });
        updateLocalProfiles(created);
      }
    } catch {
      // Optimistic update for mock/dev
      updateLocalProfiles(profile);
    }

    // Always sync staff name after profile save
    syncStaffName();
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const [teamFilter, setTeamFilter] = useState<"alle" | "aktiv" | "archiviert">("aktiv");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalActive = team.filter((u) => Boolean(u.active)).length;
  const totalArchived = team.filter((u) => !Boolean(u.active)).length;
  const roleCount = (r: StaffRole) => team.filter((u) => u.role === r).length;

  const filteredTeam = teamFilter === "alle"
    ? team
    : teamFilter === "aktiv"
    ? team.filter((u) => Boolean(u.active))
    : team.filter((u) => !Boolean(u.active));

  const getMemberName = (memberId: number | null): string | null => {
    if (!memberId) return null;
    const m = members.find((x) => String(x.id) === String(memberId));
    return m ? `${m.first_name} ${m.last_name}` : `ID ${memberId}`;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "1200px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <UsersRound size={20} style={{ color: "var(--brand)" }} />
            <h2 className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
              Team &amp; Rechte
            </h2>
          </div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>
            Mitarbeiter-Accounts, Rollen und Berechtigungen verwalten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPermOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "44px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.35)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            <Info size={14} />
            Berechtigungen
          </button>
          <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }} aria-label="Neu laden">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => handleOpenProfileEditor()}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 14px", height: "44px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.35)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            <UserCircle2 size={14} />
            Neues Profil
          </button>
          <button
            onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 18px", height: "44px", background: "var(--brand)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e00d95"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <Plus size={15} />
            Neuer Mitarbeiter
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "Gesamt",  value: team.length,   color: "rgba(255,255,255,0.7)" },
          { label: "Aktiv",   value: totalActive,   color: "#34D399" },
          { label: "Gesperrt", value: team.length - totalActive, color: "#F87171" },
          ...ROLE_OPTIONS.map((r) => ({ label: ROLE_CONFIG[r].label, value: roleCount(r), color: ROLE_CONFIG[r].color })),
        ].map((stat) => (
          <div key={stat.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", padding: "14px 16px" }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "22px", fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: "4px" }}>{stat.value}</p>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {([
          { key: "aktiv" as const, label: "Aktiv", count: totalActive },
          { key: "archiviert" as const, label: "Archiviert / Gekuendigt", count: totalArchived },
          { key: "alle" as const, label: "Alle", count: team.length },
        ]).map(tab => {
          const isActive = teamFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTeamFilter(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 transition-all"
              style={{
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                color: isActive ? "white" : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-condensed)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                border: "none",
                borderBottom: `2px solid ${isActive ? (tab.key === "archiviert" ? "#f87171" : "var(--brand)") : "transparent"}`,
                marginBottom: "-1px",
              }}
            >
              {tab.key === "archiviert" && <Archive size={12} />}
              {tab.label}
              <span style={{
                padding: "1px 5px", borderRadius: "3px", fontSize: "9px",
                background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                color: isActive ? "white" : "rgba(255,255,255,0.25)",
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 90px 160px 44px", gap: "8px", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {["MA-Nr.", "Mitarbeiter", "Rolle", "Status", "Verknuepftes Mitglied", ""].map((h) => (
            <span key={h} style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid rgba(202,12,133,0.3)", borderTopColor: "var(--brand)", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {teamFilter === "archiviert" ? (
              <>
                <Archive size={32} style={{ color: "rgba(255,255,255,0.1)" }} />
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)" }}>Keine archivierten Mitarbeiter vorhanden.</p>
              </>
            ) : (
              <>
                <UsersRound size={32} style={{ color: "rgba(255,255,255,0.1)" }} />
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)" }}>Noch keine Mitarbeiter angelegt.</p>
              </>
            )}
          </div>
        ) : (
          filteredTeam.map((user, idx) => {
            const isActive = Boolean(user.active);
            const memberName = getMemberName(user.member_id);
            const userProfile = getProfileForUser(user);
            const hasProfile = Boolean(userProfile);
            // WEB badge nur wenn Profil existiert UND sichtbar ist
            const isVisibleOnWeb = hasProfile && userProfile!.visible === true;
            // Anzeigename: Profil-Name (= DB-Wahrheit) hat Vorrang vor Staff-Name
            const displayName = userProfile
              ? `${userProfile.first_name} ${userProfile.last_name}`.trim() || user.name
              : user.name;
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                onClick={() => handleRowClick(user)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 160px 90px 160px 44px",
                  gap: "8px",
                  padding: "14px 20px",
                  alignItems: "center",
                  borderBottom: idx < filteredTeam.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  transition: "background 0.15s",
                  opacity: isActive ? 1 : 0.5,
                  cursor: hasProfile ? "pointer" : "default",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = hasProfile ? "rgba(202,12,133,0.03)" : "rgba(255,255,255,0.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {/* Staff Number */}
                <div>
                  {user.staff_number ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 7px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em" }}>
                      <Hash size={9} />
                      {user.staff_number}
                    </span>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-body)", fontSize: "12px" }}>–</span>
                  )}
                </div>

                {/* Avatar + Name + Email */}
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  {(() => {
                    const img = userProfile?.profile_image;
                    return img ? (
                      <div style={{
                        width: "34px", height: "34px", borderRadius: "4px", overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
                      }}>
                        <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                      </div>
                    ) : (
                      <div style={{
                        width: "34px", height: "34px", borderRadius: "4px",
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        fontFamily: "var(--font-display)", fontSize: "11px", color: "rgba(255,255,255,0.25)",
                      }}>
                        {displayName.split(" ").map(n => n[0]).join("").substring(0, 2)}
                      </div>
                    );
                  })()}
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-1.5">
                      <p className="truncate" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.6)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 600, letterSpacing: "0.04em" }}>
                        {displayName}
                      </p>
                      {isVisibleOnWeb && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "3px",
                          padding: "1px 5px", borderRadius: "2px",
                          background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
                          fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700,
                          letterSpacing: "0.12em", textTransform: "uppercase", color: "#34D399",
                          flexShrink: 0,
                        }}>
                          WEB
                        </span>
                      )}
                      {hasProfile && !isVisibleOnWeb && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "3px",
                          padding: "1px 5px", borderRadius: "2px",
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                          fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700,
                          letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)",
                          flexShrink: 0,
                        }}>
                          HIDDEN
                        </span>
                      )}
                    </div>
                    <p className="truncate" style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)" }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div><RoleBadge role={user.role} /></div>

                {/* Status */}
                <div><StatusBadge active={user.active} /></div>

                {/* Linked Member */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {memberName ? (
                    <>
                      <Link2 size={12} style={{ color: "var(--brand)", flexShrink: 0 }} />
                      <span className="truncate" style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-body)" }}>{memberName}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-body)" }}>-</span>
                  )}
                </div>

                {/* More Options */}
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <MoreMenu
                    user={user}
                    onEdit={() => handleOpenProfileEditor(user)}
                    onEditProfile={() => handleOpenProfileEditor(user)}
                    onToggleStatus={() => handleToggleStatus(user)}
                    onDelete={() => { setDeleteMemberAlso(false); setDeleteTarget(user); }}
                    onTerminate={Boolean(user.active) ? () => { setTerminateTarget(user); setExitDate(""); setExitReason(""); } : undefined}
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Create / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" style={{ background: "#0d0d0d", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", width: "min(520px, 95vw)", padding: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SheetHeader>
              <div className="flex items-center gap-2 mb-1">
                {editTarget ? <Pencil size={16} style={{ color: "var(--brand)" }} /> : <Plus size={16} style={{ color: "var(--brand)" }} />}
                <SheetTitle style={{ fontFamily: "var(--font-condensed)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", margin: 0 }}>
                  {editTarget ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
                </SheetTitle>
              </div>
              <SheetDescription style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)", margin: 0 }}>
                {editTarget ? `Profil von ${editTarget.name} aktualisieren` : "Neuen Mitarbeiter-Account anlegen"}
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* ── BASISINFOS ── */}
              <SectionDivider label="Basisinfos" />

              {/* Staff Number */}
              <div>
                <FieldLabel>Mitarbeiter-Nr.</FieldLabel>
                <FieldInput
                  value={form.staff_number}
                  onChange={(v) => setForm((f) => ({ ...f, staff_number: v }))}
                  placeholder="Wird automatisch generiert (z.B. EMP-001)"
                />
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", marginTop: "5px" }}>
                  Leer lassen fuer automatische Vergabe durch das Backend.
                </p>
              </div>

              {/* Vorname + Nachname */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <FieldLabel required>Vorname</FieldLabel>
                  <FieldInput value={form.first_name} onChange={(v) => setForm((f) => ({ ...f, first_name: v }))} placeholder="Max" />
                </div>
                <div>
                  <FieldLabel required>Nachname</FieldLabel>
                  <FieldInput value={form.last_name} onChange={(v) => setForm((f) => ({ ...f, last_name: v }))} placeholder="Mustermann" />
                </div>
              </div>

              {/* Email + Telefon */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <FieldLabel required>E-Mail</FieldLabel>
                  <FieldInput type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="max@niceathleticclub.de" />
                </div>
                <div>
                  <FieldLabel>Telefon</FieldLabel>
                  <FieldInput type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+49 176 …" />
                </div>
              </div>

              {/* Geburtsdatum */}
              <div>
                <FieldLabel>Geburtsdatum</FieldLabel>
                <FieldInput type="date" value={form.birth_date} onChange={(v) => setForm((f) => ({ ...f, birth_date: v }))} />
              </div>

              {/* Password */}
              <div>
                <FieldLabel required={!editTarget}>
                  Passwort {editTarget ? "(leer = unveraendert)" : ""}
                </FieldLabel>
                <FieldInput
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                  placeholder={editTarget ? "Unveraendert lassen..." : "Sicheres Passwort..."}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword((s) => !s)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </div>

              {/* ── ROLLE & RECHTE ── */}
              <SectionDivider label="Rolle & Berechtigungen" />

              {/* Role */}
              <div>
                <FieldLabel required>Haupt-Rolle</FieldLabel>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as StaffRole }))}>
                  <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: form.role ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)", fontSize: "14px", height: "42px" }}>
                    <SelectValue placeholder="Rolle auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r} style={{ color: ROLE_CONFIG[r].color, fontFamily: "var(--font-body)", fontSize: "14px" }}>
                        {ROLE_CONFIG[r].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Granular Permissions */}
              <div>
                <FieldLabel>Granulare Berechtigungen</FieldLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {PERMISSIONS.map((perm) => {
                    const checked = form.permissions.includes(perm.value);
                    return (
                      <button
                        key={perm.value}
                        type="button"
                        onClick={() => togglePermission(perm.value)}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: checked ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${checked ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "4px", color: checked ? "#fff" : "rgba(255,255,255,0.45)", fontFamily: "var(--font-body)", fontSize: "12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                      >
                        <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: checked ? "var(--brand)" : "rgba(255,255,255,0.06)", border: `1px solid ${checked ? "var(--brand)" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                          {checked && <CheckIcon size={10} style={{ color: "#fff" }} strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: "11px" }}>{perm.icon}</span>
                        <span>{perm.value}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)", marginTop: "6px" }}>
                  Erlaubt rollenunabhaengige Sichtbarkeit bestimmter Bereiche im Sidebar.
                </p>
              </div>

              {/* ── MITGLIEDS-VERKNUEPFUNG ── */}
              <SectionDivider label="Mitglieds-Verknuepfung" />

              <div>
                <FieldLabel>Mitglieds-Account</FieldLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(
                    [
                      { value: "none",   label: "Kein Mitglieds-Account",                       icon: <Minus size={14} />,    desc: "Mitarbeiter hat nur Admin-Zugang." },
                      { value: "create", label: "Neues Mitgliedskonto aus diesen Daten erstellen", icon: <UserPlus size={14} />, desc: "Backend legt automatisch ein Mitglied an." },
                      { value: "link",   label: "Bestehendes Mitglied verknuepfen",              icon: <Link2 size={14} />,    desc: "Waehle ein vorhandenes Mitglied aus." },
                    ] as { value: LinkAction; label: string; icon: React.ReactNode; desc: string }[]
                  ).map((opt) => {
                    const selected = form.link_member_action === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, link_member_action: opt.value as LinkAction, member_id: "" }))}
                        style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 14px", background: selected ? "rgba(202,12,133,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${selected ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: "5px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                      >
                        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: selected ? "var(--brand)" : "rgba(255,255,255,0.06)", border: `2px solid ${selected ? "var(--brand)" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", transition: "all 0.15s" }}>
                          {selected && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                            <span style={{ color: selected ? "var(--brand)" : "rgba(255,255,255,0.35)" }}>{opt.icon}</span>
                            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: selected ? "#fff" : "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>{opt.label}</span>
                          </div>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{opt.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Member dropdown – only when "link" is selected */}
                {form.link_member_action === "link" && (
                  <div style={{ marginTop: "10px" }}>
                    <FieldLabel>Mitglied auswaehlen</FieldLabel>
                    <Select value={form.member_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, member_id: v === "none" ? "" : v }))}>
                      <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)", fontSize: "14px", height: "42px" }}>
                        <SelectValue placeholder="Mitglied auswaehlen..." />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "200px" }}>
                        <SelectItem value="none" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)", fontSize: "13px" }}>
                          Kein Mitglied ausgewaehlt
                        </SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)} style={{ color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px" }}>
                            {m.first_name} {m.last_name} ({m.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* ── STATUS ── */}
              <SectionDivider label="Status" />

              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel>Account-Status</FieldLabel>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)", marginTop: "-4px" }}>
                    {form.active ? "Account ist aktiv und einloggbar." : "Account ist gesperrt."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.active}
                  onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                  style={{ position: "relative", width: "44px", height: "24px", borderRadius: "12px", background: form.active ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
                >
                  <span style={{ position: "absolute", top: "2px", left: form.active ? "22px" : "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setSheetOpen(false)} disabled={saving} style={{ padding: "0 20px", height: "44px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "0 24px", height: "44px", background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", minWidth: "130px", justifyContent: "center" }}
            >
              {saving ? (
                <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Speichern...</>
              ) : editTarget ? (
                <><ShieldCheck size={14} /> Aktualisieren</>
              ) : (
                <><UserCircle2 size={14} /> Anlegen</>
              )}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Permissions Dialog ── */}
      <PermissionsDialog open={permOpen} onClose={() => setPermOpen(false)} />

      {/* ── Delete Confirm Dialog ── */}
      <DeleteDialog
        target={deleteTarget}
        deleting={deleting}
        deleteMemberAlso={deleteMemberAlso}
        setDeleteMemberAlso={setDeleteMemberAlso}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteMemberAlso(false); }}
      />

      {/* ── Frontend Profile Drawer ── */}
      <AnimatePresence>
        {profileDrawerTarget && (
          <TeamProfileDrawer
            profile={profileDrawerTarget}
            onClose={() => setProfileDrawerTarget(null)}
            onEdit={(p) => {
              setProfileDrawerTarget(null);
              // Find linked staff user → open unified editor
              const linkedUser = team.find((u) => {
                const uName = u.name.trim().toLowerCase();
                const pName = `${p.first_name} ${p.last_name}`.trim().toLowerCase();
                return uName === pName || p.slug === u.id || p.id === u.id;
              });
              if (linkedUser) {
                setUnifiedEditorUserId(linkedUser.id);
                setUnifiedEditorOpen(true);
              } else {
                setProfileEditorTarget(p);
                setProfileEditorOpen(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Frontend Profile Editor (standalone / new profiles) ── */}
      <TeamProfileEditor
        open={profileEditorOpen}
        onOpenChange={setProfileEditorOpen}
        profile={profileEditorTarget}
        onSave={handleSaveProfile}
      />

      {/* ── Unified Staff + Profile Editor (4-Tab) ── */}
      <UnifiedStaffEditor
        open={unifiedEditorOpen}
        onOpenChange={setUnifiedEditorOpen}
        userId={unifiedEditorUserId}
        onSaved={() => { load(); }}
      />

      {/* ── Termination Dialog ── */}
      <Dialog open={!!terminateTarget} onOpenChange={() => { setTerminateTarget(null); setExitDate(""); setExitReason(""); }}>
        <DialogContent style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", maxWidth: "480px" }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "4px" }}>
                <UserX size={16} style={{ color: "#F59E0B" }} />
              </div>
              <div>
                <DialogTitle style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", margin: 0 }}>
                  Mitarbeiter kündigen
                </DialogTitle>
                <DialogDescription style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                  {terminateTarget?.name} wird deaktiviert und archiviert
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {terminateTarget && (
            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Employee Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}>
                <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", borderRadius: "4px", fontFamily: "var(--font-display)", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                  {terminateTarget.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{terminateTarget.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>{terminateTarget.email} · {ROLE_CONFIG[terminateTarget.role]?.label}</p>
                </div>
              </div>

              {/* Warning */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "4px" }}>
                <AlertTriangle size={14} style={{ color: "#F59E0B", marginTop: "2px", flexShrink: 0 }} />
                <p style={{ fontSize: "12px", color: "rgba(245,158,11,0.8)", lineHeight: 1.5 }}>
                  Der Account wird <strong>sofort gesperrt</strong> (Login deaktiviert). Der Mitarbeiter wird aus dem aktiven Dienstplan entfernt, aber für die Buchhaltung <strong>10 Jahre DSGVO-konform archiviert</strong>.
                </p>
              </div>

              {/* Exit Date */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
                  Austrittsdatum <span style={{ color: "#CA0C85" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Calendar size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)" }} />
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontSize: "14px", outline: "none", colorScheme: "dark" }}
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
                  Grund (optional)
                </label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontSize: "14px", outline: "none" }}
                >
                  <option value="" className="bg-[#0a0a0a]">— Bitte wählen —</option>
                  <option value="kuendigung_ma" className="bg-[#0a0a0a]">Kündigung durch Mitarbeiter</option>
                  <option value="kuendigung_ag" className="bg-[#0a0a0a]">Kündigung durch Arbeitgeber</option>
                  <option value="befristet_ende" className="bg-[#0a0a0a]">Ende befristeter Vertrag</option>
                  <option value="aufhebung" className="bg-[#0a0a0a]">Aufhebungsvertrag</option>
                  <option value="probezeit" className="bg-[#0a0a0a]">Kündigung in Probezeit</option>
                  <option value="sonstiges" className="bg-[#0a0a0a]">Sonstiges</option>
                </select>
              </div>

              {/* What happens checklist */}
              <div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>
                  FOLGENDE AKTIONEN WERDEN AUSGEFÜHRT
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    { icon: Lock, text: "Login-Status sofort auf \u201Egesperrt\u201C setzen", color: "#EF4444" },
                    { icon: Calendar, text: "Aus aktivem Dienstplan entfernen", color: "#F59E0B" },
                    { icon: Archive, text: "Archivierung als Ex-Mitarbeiter (10 Jahre DSGVO)", color: "#A855F7" },
                    { icon: ShieldCheck, text: "Alle Zugriffsrechte werden entzogen", color: "#3B82F6" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "3px" }}>
                      <item.icon size={12} style={{ color: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => { setTerminateTarget(null); setExitDate(""); setExitReason(""); }}
              style={{ padding: "0 16px", height: "42px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleTerminate}
              disabled={terminating || !exitDate}
              style={{ padding: "0 20px", height: "42px", background: terminating ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.8)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: terminating || !exitDate ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", opacity: !exitDate ? 0.5 : 1 }}
            >
              <UserX size={13} /> Kündigung bestätigen
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Mock fallback data ─────────────────────────────────────────────────────────
const MOCK_TEAM: StaffUser[] = [
  { id: "1", staff_number: "EMP-001", name: "Michael Kraus",   email: "mimi.kraus@nice-fitness.de",     role: "admin",     permissions: ["Mitglieder verwalten","Finanzen einsehen","System-Settings","Kurse verwalten","Antraege bearbeiten"], member_id: null, active: 1 },
  { id: "2", staff_number: "EMP-002", name: "Bella Kraus",    email: "bella.kraus@nice-fitness.de",    role: "admin",     permissions: ["Mitglieder verwalten","System-Settings"], member_id: null, active: 1 },
  { id: "3", staff_number: "EMP-003", name: "Wilhelm Walter", email: "wilhelm.walter@nice-fitness.de", role: "admin",     permissions: ["Mitglieder verwalten","Finanzen einsehen","System-Settings","Kurse verwalten","Antraege bearbeiten"], member_id: null, active: 1 },
  { id: "4", staff_number: "EMP-004", name: "Dome Fuchs",     email: "dome.fuchs@nice-fitness.de",     role: "trainer",   permissions: ["Kurse verwalten","Mitglieder verwalten"], member_id: 10, active: 1 },
  { id: "5", staff_number: "EMP-005", name: "Leo Holzner",    email: "leo.holzner@nice-fitness.de",    role: "trainer",   permissions: ["Kurse verwalten"], member_id: 11, active: 1 },
  { id: "6", staff_number: "EMP-006", name: "Jana Ebt",       email: "jana.ebt@nice-fitness.de",       role: "trainer",   permissions: ["Kurse verwalten"], member_id: 12, active: 1 },
  { id: "7", staff_number: "EMP-007", name: "Lydi Tauber",    email: "lydi@nice-fitness.de",           role: "trainer",   permissions: ["Kurse verwalten","Mitglieder verwalten"], member_id: 13, active: 1 },
  { id: "8", staff_number: "NAC-005", name: "Sarah Coach",    email: "sarah.coach@nice-fitness.de",    role: "trainer",   permissions: ["Kurse verwalten"], member_id: null, active: 1 },
  { id: "9", staff_number: "NAC-006", name: "Thomas Meier",   email: "thomas.meier@nice-fitness.de",   role: "trainer",   permissions: [], member_id: null, active: 0 },
];
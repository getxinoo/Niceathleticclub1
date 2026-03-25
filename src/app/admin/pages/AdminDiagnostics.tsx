/**
 * AdminDiagnostics.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NAC System-Check Dashboard – Diagnostiziert alle API-Endpunkte und
 * zeigt deren Status in Echtzeit an (gruppiert nach Modul).
 */

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Server, CheckCircle2, AlertTriangle, Loader2, Play, RotateCcw,
  Clock, Wifi, WifiOff, ShieldCheck, CreditCard, Inbox, Settings,
  Users, Activity, ChevronDown, ChevronUp, Terminal, Dumbbell,
  UserCheck, Tag, Newspaper, Link, LogIn, KeyRound, Lock,
  Star, Briefcase, UserPlus, CalendarDays, TreePalm, CalendarCheck2,
  ArrowRightLeft, Coffee, Globe, ShieldAlert,
  LayoutDashboard, FileText, Mail, MessageSquare, CircleUser,
  Zap, ClipboardList, BarChart3, HeartPulse, QrCode, Upload,
  BookOpen, ScrollText, Wallet,
} from "lucide-react";
import { BASE_URL, setMockFallbackEnabled } from "../../../lib/api-service";

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckStatus = "idle" | "running" | "ok" | "error" | "auth-missing" | "reachable" | "not-deployed";

interface DiagCheck {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon: React.ElementType;
  requiresAuth: boolean;
  group: string;
  /** POST-only endpoints: GET returns 405/400/422 → counts as "OK (erreichbar)". */
  postOnly?: boolean;
  /** Endpoint needs query params we can't provide – expected error messages = reachable. */
  needsParams?: string;
  /** Member-only endpoints: 403 with admin JWT is expected → "Erreichbar (braucht Member-JWT)". */
  memberOnly?: boolean;
}

interface CheckResult {
  id: string;
  status: CheckStatus;
  message: string;
  durationMs?: number;
  responsePreview?: string;
  errorDetail?: string;
}

interface CheckGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

// ── Direct Fetch Helper (bypasses api-service mock system) ────────────────────

async function diagFetch(endpoint: string, token?: string | null, postOnly?: boolean): Promise<unknown> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { headers });

  if (res.status === 204) return { status: 204, ok: true };

  // POST-only Endpoints: 405/400/422 = "Endpoint exists, only accepts POST" → OK
  if (postOnly && (res.status === 405 || res.status === 400 || res.status === 422)) {
    const text = await res.text().catch(() => "");
    let detail = `HTTP ${res.status}`;
    try { const p = JSON.parse(text); detail = p?.error ?? p?.message ?? detail; } catch { /* ignore */ }
    return { status: res.status, ok: true, postOnly: true, message: `Endpoint erreichbar (POST-only, GET→${res.status})`, detail };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const isHtml = text.trimStart().startsWith("<") || text.toLowerCase().includes("<!doctype");
    if (isHtml) {
      throw Object.assign(
        new Error(`HTTP ${res.status} – Server lieferte HTML statt JSON (PHP/DB-Fehler)`),
        { status: res.status }
      );
    }
    try {
      const parsed = JSON.parse(text);
      throw Object.assign(
        new Error(parsed?.error ?? parsed?.message ?? `HTTP ${res.status}`),
        { status: res.status, serverError: parsed?.error ?? parsed?.message }
      );
    } catch (e) {
      if (e instanceof Error && "status" in e) throw e;
      throw Object.assign(
        new Error(text || `HTTP ${res.status} (${res.statusText})`),
        { status: res.status }
      );
    }
  }

  // Handle empty responses (e.g. endpoints that return 200 with no body)
  const text = await res.text();
  if (!text || text.trim() === "") {
    return { status: res.status, ok: true, empty: true, message: "OK (leere Antwort)" };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { status: res.status, ok: true, raw: text.slice(0, 200) };
  }
}

/** Holt den JWT des aktuell eingeloggten Users aus localStorage. */
function getSessionToken(): string | null {
  try {
    const token = localStorage.getItem("nac_auth_token");
    if (!token) return null;
    if (token.startsWith("mock-")) return null;
    return token;
  } catch {
    return null;
  }
}

// ── Check Groups ──────────────────────────────────────────────────────────────

const GROUPS: CheckGroup[] = [
  { id: "auth",    label: "Authentifizierung",     icon: LogIn,        color: "#A855F7", description: "Login, Session, JWT & Onboarding" },
  { id: "public",  label: "Öffentliche APIs",      icon: Globe,        color: "#3B82F6", description: "Für Website-Besucher zugängliche Endpunkte" },
  { id: "crm",     label: "CRM & Mitglieder",      icon: Users,        color: "#22C55E", description: "Leads, Mitglieder, Anträge, Notizen" },
  { id: "studio",  label: "Studio Management",     icon: Dumbbell,     color: "#CA0C85", description: "Kurse, Buchungen, Finanzen, Tarife, Coaching" },
  { id: "content", label: "Content & Marketing",   icon: Star,         color: "#F59E0B", description: "Team, Presse, Reviews, Seiten" },
  { id: "hr",      label: "HR & Einsatzplanung",   icon: Briefcase,    color: "#EC4899", description: "Karriere, Bewerber, Schichten, Abwesenheiten, Aufgaben" },
  { id: "member",  label: "Member-Portal",         icon: UserCheck,    color: "#06B6D4", description: "Self-Service Endpunkte für eingeloggte Mitglieder" },
  { id: "system",  label: "System & Infrastruktur", icon: Settings,     color: "#6366F1", description: "Settings, Audit, Integrationen, SMTP, Dashboard" },
];

// ── Check Definitions ─────────────────────────────────────────────────────────

const CHECKS: DiagCheck[] = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    id: "auth-ping", name: "Auth / Session",
    description: "Prüft ob der Session-JWT vom Server akzeptiert wird.",
    endpoint: "/admin/settings.php", icon: LogIn, requiresAuth: false, group: "auth",
  },
  {
    id: "auth-login", name: "Login-Endpoint",
    description: "Prüft ob /login.php erreichbar ist (POST-only, GET→405 = OK).",
    endpoint: "/login.php", icon: KeyRound, requiresAuth: false, group: "auth", postOnly: true,
  },
  {
    id: "auth-onboard", name: "Onboarding-Endpoint",
    description: "Prüft ob /onboard.php erreichbar ist (POST-only, GET→405 = OK).",
    endpoint: "/onboard.php", icon: UserPlus, requiresAuth: false, group: "auth", postOnly: true,
  },
  {
    id: "auth-me", name: "Admin Me / Profil",
    description: "Prüft den eingeloggten Admin-User (JWT-geschützt).",
    endpoint: "/admin/me.php", icon: CircleUser, requiresAuth: true, group: "auth",
  },

  // ── Public ─────────────────────────────────────────────────────────────────
  {
    id: "public-team", name: "Team (Public)",
    description: "Öffentliche Team-Seite – sichtbare Teammitglieder.",
    endpoint: "/team.php", icon: UserCheck, requiresAuth: false, group: "public",
  },
  {
    id: "public-tarife", name: "Tarife (Public)",
    description: "Öffentliche Mitgliedschaftstarife (active=1).",
    endpoint: "/tarife.php", icon: Tag, requiresAuth: false, group: "public",
  },
  {
    id: "public-pricing", name: "Pricing / Modulare Preise",
    description: "Modulare Pricing-Daten (Basis-Tarife + Add-ons).",
    endpoint: "/pricing.php", icon: CreditCard, requiresAuth: false, group: "public",
  },
  {
    id: "public-pricing-pages", name: "Pricing Pages API",
    description: "Seitenspezifische Pricing-Daten (/public/pricing.php).",
    endpoint: "/public/pricing.php", icon: ScrollText, requiresAuth: false, group: "public",
  },
  {
    id: "public-kurse", name: "Kurse (Public)",
    description: "Öffentlicher Kursplan / Stundenplan.",
    endpoint: "/kurse.php", icon: Dumbbell, requiresAuth: false, group: "public",
  },
  {
    id: "public-bookings", name: "Buchungen (Public)",
    description: "Kursbuchungen-Übersicht (benötigt Auth).",
    endpoint: "/bookings.php", icon: CalendarCheck2, requiresAuth: true, group: "studio",
  },
  {
    id: "public-press", name: "Presse (Public)",
    description: "Öffentliche Presseberichte / Medienerwähnungen.",
    endpoint: "/press.php", icon: Newspaper, requiresAuth: false, group: "public",
  },
  {
    id: "public-reviews", name: "Reviews (Public)",
    description: "Öffentliche Google-Rezensionen (visible=1).",
    endpoint: "/reviews.php", icon: Star, requiresAuth: false, group: "public",
  },
  {
    id: "public-karriere", name: "Karriere (Public)",
    description: "Öffentliche Karriere-Daten (Jobs + Benefits).",
    endpoint: "/karriere.php", icon: Briefcase, requiresAuth: false, group: "public",
  },
  {
    id: "leads", name: "Leads-Tabelle",
    description: "Prüft ob die Lead-Daten abrufbar sind.",
    endpoint: "/leads.php", icon: Activity, requiresAuth: false, group: "public",
  },
  {
    id: "public-pages", name: "Seiten / CMS",
    description: "Öffentliche Seiten-Daten (pages.php).",
    endpoint: "/pages.php", icon: FileText, requiresAuth: false, group: "public",
  },

  // ── CRM & Mitglieder ──────────────────────────────────────────────────────
  {
    id: "members", name: "Mitglieder DB",
    description: "Liest die Mitgliederliste aus der Datenbank.",
    endpoint: "/admin/members.php", icon: Users, requiresAuth: true, group: "crm",
  },
  {
    id: "requests", name: "Antrags-System",
    description: "Prüft Pausen- und Kündigungs-Anfragen.",
    endpoint: "/admin/requests.php", icon: Inbox, requiresAuth: true, group: "crm",
  },
  {
    id: "admin-convert-lead", name: "Lead-Konvertierung",
    description: "Lead → Mitglied Konvertierungs-Endpoint.",
    endpoint: "/admin/convert_lead.php", icon: Zap, requiresAuth: true, group: "crm", postOnly: true,
  },
  {
    id: "admin-member-notes", name: "Mitglieder-Notizen",
    description: "Notizen/Kommentare zu Mitgliedern (braucht member_id).",
    endpoint: "/admin/member_notes.php", icon: MessageSquare, requiresAuth: true, group: "crm",
    needsParams: "member_id",
  },

  // ── Studio Management ─────────────────────────────────────────────────────
  {
    id: "admin-kurse", name: "Kurse (Admin)",
    description: "Kurs-Verwaltung inkl. inaktiver Kurse.",
    endpoint: "/kurse.php?all=1", icon: Dumbbell, requiresAuth: true, group: "studio",
  },
  {
    id: "admin-bookings", name: "Buchungen (Admin)",
    description: "Kursbuchungen-Verwaltung (Admin CRUD).",
    endpoint: "/admin/bookings.php", icon: CalendarCheck2, requiresAuth: true, group: "studio",
  },
  {
    id: "finances", name: "Finanz-Modul (Rechnungen)",
    description: "Rechnungsliste aus dem Finanz-Modul.",
    endpoint: "/admin/finances.php?type=invoices", icon: CreditCard, requiresAuth: true, group: "studio",
  },
  {
    id: "finances-mandates", name: "Finanz-Modul (SEPA-Mandate)",
    description: "SEPA-Lastschrift-Mandate aller Mitglieder.",
    endpoint: "/admin/finances.php?type=mandates", icon: Wallet, requiresAuth: true, group: "studio",
  },
  {
    id: "finances-transactions", name: "Finanz-Modul (Transaktionen)",
    description: "Zahlungstransaktionen & Buchungshistorie.",
    endpoint: "/admin/finances.php?type=transactions", icon: ArrowRightLeft, requiresAuth: true, group: "studio",
  },
  {
    id: "finances-inkasso", name: "Finanz-Modul (Inkasso)",
    description: "Offene Inkasso-Fälle & Mahnungen.",
    endpoint: "/admin/finances.php?type=inkasso", icon: ShieldAlert, requiresAuth: true, group: "studio",
  },
  {
    id: "tarife-admin", name: "Tarife (Admin)",
    description: "Alle Tarife inkl. inaktiver (Admin-CRUD).",
    endpoint: "/tarife.php?all=1", icon: Tag, requiresAuth: true, group: "studio",
  },
  {
    id: "admin-coaching", name: "Coaching (Admin)",
    description: "Personal-Training & Coaching-Buchungen (Admin).",
    endpoint: "/admin/coaching.php", icon: HeartPulse, requiresAuth: true, group: "studio",
  },
  {
    id: "admin-tracking", name: "Tracking (Admin)",
    description: "Mitglieder-Tracking & Statistiken (braucht member_id).",
    endpoint: "/admin/tracking.php", icon: BarChart3, requiresAuth: true, group: "studio",
    needsParams: "member_id",
  },

  // ── Content & Marketing ───────────────────────────────────────────────────
  {
    id: "team-admin", name: "Team (Admin)",
    description: "Alle Teammitglieder inkl. unsichtbarer.",
    endpoint: "/team.php?all=1", icon: UserCheck, requiresAuth: true, group: "content",
  },
  {
    id: "press-admin", name: "Presse (Admin)",
    description: "Presseberichte-Verwaltung (Admin-CRUD).",
    endpoint: "/press.php", icon: Newspaper, requiresAuth: true, group: "content",
  },
  {
    id: "admin-reviews", name: "Reviews (Admin)",
    description: "Alle Reviews + Stats (Admin-CRUD, Google-Sync).",
    endpoint: "/reviews.php?all=1", icon: Star, requiresAuth: true, group: "content",
  },

  // ── HR & Einsatzplanung ───────────────────────────────────────────────────
  {
    id: "admin-karriere", name: "Karriere (Admin)",
    description: "Alle Jobs + Benefits + Bewerber (Admin-CRUD).",
    endpoint: "/karriere.php?admin=1", icon: Briefcase, requiresAuth: true, group: "hr",
  },
  {
    id: "admin-shifts", name: "Schichten / Einsatzplan",
    description: "Wöchentliche Schichtplanung laden.",
    endpoint: "/karriere.php?action=shifts&week=2026-03-09", icon: CalendarDays, requiresAuth: true, group: "hr",
  },
  {
    id: "admin-swap-offers", name: "Tausch-Angebote",
    description: "Offene Schicht-Tauschangebote laden.",
    endpoint: "/absences.php?action=swap_offers", icon: ArrowRightLeft, requiresAuth: true, group: "hr",
  },
  {
    id: "admin-absences", name: "Abwesenheiten",
    description: "Alle Abwesenheiten (Urlaub, Krank, etc.) laden.",
    endpoint: "/absences.php", icon: TreePalm, requiresAuth: true, group: "hr",
  },
  {
    id: "admin-absence-budgets", name: "Urlaubsbudgets",
    description: "Urlaubsbudgets aller Mitarbeiter laden.",
    endpoint: "/absences.php?action=budgets", icon: CalendarCheck2, requiresAuth: true, group: "hr",
  },
  {
    id: "admin-workflow-tasks", name: "Workflow-Aufgaben",
    description: "Offene Aufgaben & Workflows (HR/Admin).",
    endpoint: "/admin/workflow_tasks.php", icon: ClipboardList, requiresAuth: true, group: "hr",
  },

  // ── Member-Portal ─────────────────────────────────────────────────────────
  {
    id: "member-profile", name: "Member Profil",
    description: "Mitglieder-Profil (Self-Service, braucht Member-JWT).",
    endpoint: "/member/profile.php", icon: CircleUser, requiresAuth: true, group: "member", memberOnly: true,
  },
  {
    id: "member-stats", name: "Member Statistiken",
    description: "Trainingsstatistiken des eingeloggten Members.",
    endpoint: "/member/stats.php", icon: BarChart3, requiresAuth: true, group: "member", memberOnly: true,
  },
  {
    id: "member-bookings", name: "Member Buchungen",
    description: "Eigene Kursbuchungen des Members.",
    endpoint: "/member/bookings.php", icon: CalendarCheck2, requiresAuth: true, group: "member", memberOnly: true,
  },
  {
    id: "member-book", name: "Kurs buchen",
    description: "Kurs-Buchungs-Endpoint (POST-only).",
    endpoint: "/member/book.php", icon: BookOpen, requiresAuth: true, group: "member", postOnly: true, memberOnly: true,
  },
  {
    id: "member-checkin", name: "Check-In",
    description: "QR-Code Check-In Endpoint.",
    endpoint: "/member/checkin.php", icon: QrCode, requiresAuth: true, group: "member", postOnly: true, memberOnly: true,
  },
  {
    id: "member-coaching", name: "Coaching (Member)",
    description: "Personal-Training Buchungen (braucht member_id).",
    endpoint: "/member/coaching.php", icon: HeartPulse, requiresAuth: true, group: "member", memberOnly: true,
    needsParams: "member_id",
  },
  {
    id: "member-contracts", name: "Verträge",
    description: "Vertragsdaten des eingeloggten Members.",
    endpoint: "/member/contracts.php", icon: ScrollText, requiresAuth: true, group: "member", memberOnly: true,
  },
  {
    id: "member-sessions", name: "Trainings-Sessions",
    description: "Vergangene Trainingseinheiten des Members.",
    endpoint: "/member/sessions.php", icon: Dumbbell, requiresAuth: true, group: "member", memberOnly: true,
  },
  {
    id: "member-tracking", name: "Körper-Tracking",
    description: "Gewicht, Körperfett & Fortschrittsdaten.",
    endpoint: "/member/tracking.php", icon: Activity, requiresAuth: true, group: "member", memberOnly: true,
  },
  {
    id: "member-sepa", name: "SEPA / Zahlungsdaten",
    description: "SEPA-Lastschriftdaten des Members.",
    endpoint: "/member/sepa.php", icon: Wallet, requiresAuth: true, group: "member", memberOnly: true,
  },

  // ── System & Infrastruktur ────────────────────────────────────────────────
  {
    id: "settings", name: "Settings-Tabelle",
    description: "System-Einstellungen des Studios.",
    endpoint: "/admin/settings.php", icon: Settings, requiresAuth: true, group: "system",
  },
  {
    id: "users", name: "Staff / Benutzer",
    description: "Interne Benutzerverwaltung (Admin, Trainer, etc.).",
    endpoint: "/admin/users.php", icon: Users, requiresAuth: true, group: "system",
  },
  {
    id: "audit", name: "Audit-Log",
    description: "Audit-Trail aus der Datenbank.",
    endpoint: "/admin/audit_logs.php", icon: ShieldCheck, requiresAuth: true, group: "system",
  },
  {
    id: "integrations", name: "Integrationen",
    description: "Magicline-Integration Settings & Verbindungsstatus.",
    endpoint: "/admin/integrations.php?action=settings", icon: Link, requiresAuth: true, group: "system",
  },
  {
    id: "admin-smtp", name: "SMTP / E-Mail",
    description: "SMTP-Konfiguration & Mailserver-Status.",
    endpoint: "/admin/smtp.php", icon: Mail, requiresAuth: true, group: "system",
  },
  {
    id: "admin-dashboard", name: "Dashboard-Daten",
    description: "Aggregierte Dashboard-Statistiken (KPIs).",
    endpoint: "/dashboard.php", icon: LayoutDashboard, requiresAuth: true, group: "system",
  },
  {
    id: "cron-reviews", name: "Cron: Google Reviews",
    description: "Google Reviews Sync-Cronjob (braucht ?secret=...).",
    endpoint: "/cron/fetch-reviews.php", icon: Star, requiresAuth: false, group: "system",
    needsParams: "secret",
    postOnly: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function safePreview(data: unknown): string {
  try {
    const str = JSON.stringify(data);
    if (str.length > 300) return str.slice(0, 297) + "…";
    return str;
  } catch {
    return String(data);
  }
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: CheckStatus }) {
  if (status === "running") return <Loader2 size={14} className="animate-spin shrink-0" style={{ color: "#CA0C85" }} />;
  if (status === "ok") return <CheckCircle2 size={14} className="shrink-0" style={{ color: "#22c55e" }} />;
  if (status === "error") return <AlertTriangle size={14} className="shrink-0" style={{ color: "#ef4444" }} />;
  if (status === "auth-missing") return <KeyRound size={14} className="shrink-0" style={{ color: "#FFC107" }} />;
  if (status === "reachable") return <Wifi size={14} className="shrink-0" style={{ color: "#FFC107" }} />;
  if (status === "not-deployed") return <ShieldAlert size={14} className="shrink-0" style={{ color: "#FFC107" }} />;
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.15)" }} />;
}

function CheckRow({ check, result }: { check: DiagCheck; result: CheckResult | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const status = result?.status ?? "idle";
  const hasDetail = result && (result.responsePreview || result.errorDetail || result.message);

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s" }} className="hover:bg-white/[0.02]">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => hasDetail && setExpanded(v => !v)}>
        <StatusDot status={status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white/90 truncate" style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em" }}>
              {check.name}
            </span>
            {check.requiresAuth && <Lock size={9} style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }} />}
            {check.postOnly && (
              <span style={{ fontSize: "8px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", padding: "1px 4px" }}>POST</span>
            )}
          </div>
          <span className="font-mono truncate block" style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", marginTop: "1px" }}>
            {check.endpoint}
          </span>
        </div>
        {result?.durationMs !== undefined && (
          <span className="hidden sm:flex items-center gap-1 shrink-0" style={{ color: result.durationMs > 2000 ? "#F59E0B" : "rgba(255,255,255,0.25)", fontSize: "11px", fontFamily: "var(--font-condensed)", letterSpacing: "0.04em" }}>
            <Clock size={10} />{formatDuration(result.durationMs)}
          </span>
        )}
        <span className="shrink-0 text-right" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: status === "ok" ? "#22c55e" : status === "error" ? "#ef4444" : status === "auth-missing" ? "#FFC107" : status === "running" ? "#CA0C85" : "rgba(255,255,255,0.15)", minWidth: "50px" }}>
          {status === "ok" ? "OK" : status === "error" ? "FEHLER" : status === "auth-missing" ? "AUTH" : status === "running" ? "…" : "–"}
        </span>
        {hasDetail && (
          <button className="shrink-0 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer", width: "20px", height: "20px" }} aria-label={expanded ? "Einklappen" : "Details"}>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && result && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div className="px-4 pb-3" style={{ paddingLeft: "40px" }}>
              <div className="flex items-start gap-2 p-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <Terminal size={11} className="mt-0.5 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                <pre className="flex-1 whitespace-pre-wrap break-all" style={{ fontFamily: "monospace", fontSize: "10px", color: status === "error" ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>
                  {status === "error" ? result.errorDetail ?? result.message : result.responsePreview ?? result.message}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupCard({ group, checks, results, isRunning }: { group: CheckGroup; checks: DiagCheck[]; results: CheckResult[]; isRunning: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const groupResults = checks.map(c => results.find(r => r.id === c.id));
  const okCount = groupResults.filter(r => r?.status === "ok").length;
  const errCount = groupResults.filter(r => r?.status === "error").length;
  const authCount = groupResults.filter(r => r?.status === "auth-missing").length;
  const runningCount = groupResults.filter(r => r?.status === "running").length;
  const total = checks.length;
  const done = okCount + errCount + authCount;
  const Icon = group.icon;

  const overallStatus = runningCount > 0 ? "running" : errCount > 0 ? "error" : authCount > 0 && okCount === 0 ? "auth" : done === total && errCount === 0 ? "ok" : "idle";
  const borderColor = overallStatus === "ok" ? `${group.color}40` : overallStatus === "error" ? "rgba(239,68,68,0.3)" : overallStatus === "running" ? `${group.color}30` : "rgba(255,255,255,0.06)";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${borderColor}`, overflow: "hidden", transition: "border-color 0.3s" }}>
      <button className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer" style={{ background: "none", border: "none", borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.04)" }} onClick={() => setCollapsed(v => !v)}>
        <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ background: `${group.color}15`, border: `1px solid ${group.color}30` }}>
          <Icon size={15} style={{ color: group.color }} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{group.label}</span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)", letterSpacing: "0.06em" }}>{total} {total === 1 ? "Endpunkt" : "Endpunkte"}</span>
          </div>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>{group.description}</span>
        </div>
        {done > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {okCount > 0 && <span className="flex items-center gap-1" style={{ fontSize: "11px", fontFamily: "var(--font-condensed)", fontWeight: 700, color: "#22c55e", letterSpacing: "0.06em" }}><CheckCircle2 size={11} /> {okCount}</span>}
            {errCount > 0 && <span className="flex items-center gap-1" style={{ fontSize: "11px", fontFamily: "var(--font-condensed)", fontWeight: 700, color: "#ef4444", letterSpacing: "0.06em" }}><AlertTriangle size={11} /> {errCount}</span>}
            {authCount > 0 && <span className="flex items-center gap-1" style={{ fontSize: "11px", fontFamily: "var(--font-condensed)", fontWeight: 700, color: "#FFC107", letterSpacing: "0.06em" }}><KeyRound size={11} /> {authCount}</span>}
          </div>
        )}
        {done > 0 && (
          <div className="w-16 shrink-0 hidden sm:block">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(done / total) * 100}%`, background: errCount > 0 ? "#ef4444" : group.color }} />
            </div>
          </div>
        )}
        <div className="shrink-0">
          {overallStatus === "ok" && <span className="flex items-center gap-1 px-2 py-0.5" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", fontSize: "9px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.12em", color: "#22c55e" }}>ALL OK</span>}
          {overallStatus === "error" && <span className="flex items-center gap-1 px-2 py-0.5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "9px", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.12em", color: "#ef4444" }}>FEHLER</span>}
          {overallStatus === "running" && <Loader2 size={14} className="animate-spin" style={{ color: group.color }} />}
        </div>
        <motion.span animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.2 }} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}><ChevronDown size={14} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
            {checks.map(check => <CheckRow key={check.id} check={check} result={results.find(r => r.id === check.id)} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminDiagnostics() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "ok" | "failed">("idle");
  const realTokenRef = useRef<string | null>(null);

  const groupedChecks = useMemo(() => {
    return GROUPS.map(g => ({ group: g, checks: CHECKS.filter(c => c.group === g.id) })).filter(g => g.checks.length > 0);
  }, []);

  const updateResult = useCallback((update: Partial<CheckResult> & { id: string }) => {
    setResults((prev) => {
      const existing = prev.find((r) => r.id === update.id);
      if (existing) return prev.map((r) => (r.id === update.id ? { ...r, ...update } : r));
      return [...prev, { status: "idle", message: "", ...update }];
    });
  }, []);

  const stats = useMemo(() => {
    const ok = results.filter(r => r.status === "ok").length;
    const errors = results.filter(r => r.status === "error").length;
    const auth = results.filter(r => r.status === "auth-missing").length;
    const running = results.filter(r => r.status === "running").length;
    const done = ok + errors + auth;
    const total = CHECKS.length;
    const avgMs = results.filter(r => r.durationMs).reduce((s, r) => s + (r.durationMs ?? 0), 0) / Math.max(1, results.filter(r => r.durationMs).length);
    return { ok, errors, auth, running, done, total, avgMs };
  }, [results]);

  const runChecks = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setHasRun(false);
    setResults([]);
    setStartedAt(new Date());
    setAuthStatus("idle");
    realTokenRef.current = null;
    setMockFallbackEnabled(false);
    const sessionToken = getSessionToken();

    try {
      const publicChecks = CHECKS.filter(c => !c.requiresAuth);
      const adminChecks = CHECKS.filter(c => c.requiresAuth);

      // Phase 1: Public Checks + Auth
      for (const check of publicChecks) {
        updateResult({ id: check.id, status: "running", message: "Verbinde…" });
        const t0 = performance.now();
        try {
          let data: unknown;
          if (check.id === "auth-ping") {
            if (sessionToken) {
              try {
                const testRes = await fetch(`${BASE_URL}/admin/settings.php`, {
                  headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${sessionToken}` },
                });
                if (testRes.ok || testRes.status === 200) {
                  realTokenRef.current = sessionToken;
                  setAuthStatus("ok");
                  data = { session_token: true, token_preview: sessionToken.slice(0, 20) + "…", validated: true };
                } else if (testRes.status === 401 || testRes.status === 403) {
                  setAuthStatus("failed");
                  const responseText = await testRes.text().catch(() => "");
                  const ms = Math.round(performance.now() - t0);
                  updateResult({
                    id: check.id, status: "auth-missing",
                    message: `Server antwortet ${testRes.status} – Token abgelehnt.`,
                    durationMs: ms,
                    responsePreview: safePreview({ http_status: testRes.status, token_sent: true, server_response: responseText.slice(0, 200) }),
                    errorDetail: [`HTTP ${testRes.status}: Server hat den JWT abgelehnt.`, "", "Mögliche Ursachen:", "  1. .htaccess leitet Authorization-Header nicht weiter", "  2. Token ist abgelaufen", "  3. User hat keine Admin-Rolle im Token", "", "Lösung (.htaccess für Checkdomain/CGI):", '  RewriteCond %{HTTP:Authorization} ^(.*)$', '  RewriteRule .* - [E=HTTP_AUTHORIZATION:%1]'].join("\n"),
                  });
                  await new Promise(r => setTimeout(r, 120));
                  continue;
                } else {
                  realTokenRef.current = sessionToken;
                  setAuthStatus("ok");
                  data = { session_token: true, validated: "unknown", http_status: testRes.status };
                }
              } catch (netErr) {
                setAuthStatus("failed");
                throw new Error(`Netzwerkfehler: ${netErr instanceof Error ? netErr.message : String(netErr)}`);
              }
            } else {
              setAuthStatus("failed");
              const isMock = (() => { try { return localStorage.getItem("nac_auth_token")?.startsWith("mock-"); } catch { return false; } })();
              const ms = Math.round(performance.now() - t0);
              updateResult({
                id: check.id, status: "auth-missing",
                message: isMock ? "Mock-Session – kein echter Server-JWT." : "Kein Session-Token gefunden.",
                durationMs: ms,
                responsePreview: safePreview({ mock_session: isMock }),
                errorDetail: isMock ? "Du bist in einer Mock-Session eingeloggt.\nFür echte API-Tests muss ein Server-Login erfolgen." : "Kein JWT-Token in localStorage gefunden.\nBitte einloggen und erneut starten.",
              });
              await new Promise(r => setTimeout(r, 120));
              continue;
            }
          } else {
            data = await diagFetch(check.endpoint, undefined, check.postOnly);
          }
          const ms = Math.round(performance.now() - t0);
          updateResult({ id: check.id, status: "ok", message: `OK (${formatDuration(ms)})`, durationMs: ms, responsePreview: safePreview(data) });
        } catch (err: unknown) {
          const ms = Math.round(performance.now() - t0);
          const errMsg = err instanceof Error ? err.message : String(err);
          const httpStatus = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;

          // needsParams for public checks: 400/403/422/500 with missing params = endpoint is reachable
          if (check.needsParams && (httpStatus === 400 || httpStatus === 403 || httpStatus === 422 || httpStatus === 500)) {
            updateResult({
              id: check.id, status: "ok",
              message: `Erreichbar (${formatDuration(ms)}) – braucht ?${check.needsParams}`,
              durationMs: ms,
              responsePreview: safePreview({ reachable: true, needsParams: check.needsParams, httpStatus, serverResponse: errMsg }),
            });
          } else {
            updateResult({ id: check.id, status: "error", message: errMsg, durationMs: ms, errorDetail: errMsg });
          }
          if (check.id === "auth-ping") setAuthStatus("failed");
        }
        await new Promise(r => setTimeout(r, 120));
      }

      // Phase 2: Admin/Auth-Required Checks
      const token = realTokenRef.current;
      for (const check of adminChecks) {
        updateResult({ id: check.id, status: "running", message: token ? "Prüfe mit JWT…" : "Prüfe…" });
        const t0 = performance.now();
        try {
          const data = await diagFetch(check.endpoint, token, check.postOnly);
          const ms = Math.round(performance.now() - t0);
          updateResult({ id: check.id, status: "ok", message: `OK (${formatDuration(ms)})`, durationMs: ms, responsePreview: safePreview(data) });
        } catch (err: unknown) {
          const ms = Math.round(performance.now() - t0);
          const httpStatus = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;
          const errMsg = err instanceof Error ? err.message : String(err);

          // needsParams: endpoint responded with "param required" → it's reachable & working
          if (check.needsParams && (httpStatus === 400 || httpStatus === 422)) {
            updateResult({
              id: check.id, status: "ok",
              message: `Erreichbar (${formatDuration(ms)}) – braucht ?${check.needsParams}`,
              durationMs: ms,
              responsePreview: safePreview({ reachable: true, needsParams: check.needsParams, serverResponse: errMsg }),
            });
          // "File not found" = PHP file not deployed yet → special status
          // Only treat as "not deployed" on true HTTP 404 from the web server
          // PHP application errors (500, etc.) with "not found" text are NOT deployment issues
          } else if (httpStatus === 404) {
            updateResult({
              id: check.id, status: "auth-missing",
              message: `Nicht deployed (${formatDuration(ms)})`,
              durationMs: ms,
              errorDetail: `PHP-Datei nicht auf dem Server gefunden.\n\n→ ${check.endpoint} muss noch per FTP hochgeladen werden.\n\nPfad auf Server: /api${check.endpoint}`,
            });
          // memberOnly + 403 = expected, admin JWT can't access member endpoints
          } else if (check.memberOnly && (httpStatus === 401 || httpStatus === 403)) {
            updateResult({
              id: check.id, status: "ok",
              message: `Erreichbar (${formatDuration(ms)}) – braucht Member-JWT`,
              durationMs: ms,
              responsePreview: safePreview({ reachable: true, memberOnly: true, serverResponse: errMsg, hint: "Admin-JWT kann nicht auf Member-Endpoints zugreifen – das ist korrekt." }),
            });
          } else if (!token && (httpStatus === 401 || httpStatus === 403)) {
            updateResult({ id: check.id, status: "auth-missing", message: `Server antwortet (${httpStatus}) – kein gültiger JWT.`, durationMs: ms, errorDetail: `HTTP ${httpStatus}: Endpoint erreichbar, aber Auth fehlt.\nMit echten Server-Credentials einloggen.` });
          } else if (token && (httpStatus === 401 || httpStatus === 403)) {
            updateResult({ id: check.id, status: "error", message: `Auth abgelehnt (${httpStatus}).`, durationMs: ms, errorDetail: `HTTP ${httpStatus}: Token vom Server abgelehnt.\n• Token abgelaufen?\n• Keine Admin-Rolle?\n• .htaccess Authorization-Header nicht weitergeleitet?` });
          } else {
            updateResult({ id: check.id, status: "error", message: errMsg, durationMs: ms, errorDetail: errMsg });
          }
        }
        await new Promise(r => setTimeout(r, 120));
      }
    } finally {
      setMockFallbackEnabled(true);
    }
    setIsRunning(false);
    setHasRun(true);
  }, [isRunning, updateResult]);

  const reset = () => { setResults([]); setHasRun(false); setStartedAt(null); setAuthStatus("idle"); realTokenRef.current = null; };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>SYSTEM-CHECK</h1>
          <p className="text-white/35 text-sm mt-1">{CHECKS.length} API-Endpunkte · {GROUPS.length} Module · Base: <span className="font-mono text-white/20">{BASE_URL}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {hasRun && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={reset} className="flex items-center gap-2 px-4 cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", minHeight: "44px" }}>
              <RotateCcw size={13} /> RESET
            </motion.button>
          )}
          <motion.button onClick={runChecks} disabled={isRunning} whileHover={{ y: -1, boxShadow: "0 0 20px rgba(202,12,133,0.4)" }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-6 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "#CA0C85", border: "none", color: "white", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", minHeight: "44px" }}>
            {isRunning ? <><Loader2 size={14} className="animate-spin" /> CHECK LÄUFT…</> : <><Play size={14} /> ALLE PRÜFEN</>}
          </motion.button>
        </div>
      </div>

      {/* Stats Overview */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "GEPRÜFT", value: stats.done, total: stats.total, color: "rgba(255,255,255,0.5)" },
            { label: "OK", value: stats.ok, icon: CheckCircle2, color: "#22c55e" },
            { label: "FEHLER", value: stats.errors, icon: AlertTriangle, color: "#ef4444" },
            { label: "AUTH FEHLT", value: stats.auth, icon: KeyRound, color: "#FFC107" },
            { label: "Ø LATENZ", value: stats.avgMs > 0 ? `${Math.round(stats.avgMs)}ms` : "–", icon: Clock, color: "rgba(255,255,255,0.4)" },
          ].map((s, i) => {
            const SIcon = s.icon;
            return (
              <div key={i} className="px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  {SIcon && <SIcon size={11} style={{ color: s.color }} />}
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: typeof s.value === "number" && s.value > 0 ? s.color : "rgba(255,255,255,0.15)" }}>
                  {typeof s.value === "number" ? s.value : s.value}
                  {s.total !== undefined && <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.15)", marginLeft: "2px" }}>/{s.total}</span>}
                </span>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Progress Bar */}
      {stats.done > 0 && (
        <div className="mb-6">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(stats.done / stats.total) * 100}%` }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ background: stats.errors > 0 ? "linear-gradient(to right, #22c55e, #ef4444)" : stats.auth > 0 ? "linear-gradient(to right, #22c55e, #FFC107)" : "#22c55e" }} />
          </div>
          {startedAt && (
            <p className="mt-1.5" style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-condensed)", letterSpacing: "0.05em" }}>
              Gestartet: {startedAt.toLocaleTimeString("de-DE")}{hasRun && ` · Abgeschlossen in ${formatDuration(Date.now() - startedAt.getTime())}`}
            </p>
          )}
        </div>
      )}

      {/* Auth Banner */}
      {authStatus !== "idle" && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 py-2.5 mb-6" style={{ background: authStatus === "ok" ? "rgba(34,197,94,0.05)" : "rgba(255,193,7,0.05)", border: `1px solid ${authStatus === "ok" ? "rgba(34,197,94,0.12)" : "rgba(255,193,7,0.12)"}` }}>
          {authStatus === "ok" ? <Lock size={13} style={{ color: "#22c55e" }} /> : <KeyRound size={13} style={{ color: "#FFC107" }} />}
          <span style={{ fontSize: "11px", color: authStatus === "ok" ? "#22c55e" : "#FFC107", fontFamily: "var(--font-condensed)", letterSpacing: "0.04em" }}>
            {authStatus === "ok" ? "Session-JWT validiert – Admin-Endpunkte werden authentifiziert getestet." : "Kein echter Server-JWT – Admin-Endpunkte können nicht authentifiziert werden."}
          </span>
        </motion.div>
      )}

      {/* Grouped Check Cards */}
      <div className="space-y-3">
        {groupedChecks.map(({ group, checks }) => (
          <GroupCard key={group.id} group={group} checks={checks} results={results} isRunning={isRunning} />
        ))}
      </div>

      {/* Idle Hint */}
      {!isRunning && !hasRun && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-5 py-4 mt-6" style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)" }}>
          <WifiOff size={14} style={{ color: "rgba(255,255,255,0.15)" }} />
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
            Klicke <strong className="text-white/40">"ALLE PRÜFEN"</strong>, um alle {CHECKS.length} Endpunkte nacheinander zu testen.
          </p>
        </motion.div>
      )}

      {/* Final result */}
      {hasRun && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 px-5 py-4 mt-6" style={{ background: stats.errors > 0 ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.05)", border: `1px solid ${stats.errors > 0 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"}` }}>
          <div className="flex items-center gap-3">
            {stats.errors > 0 ? <AlertTriangle size={18} style={{ color: "#ef4444" }} /> : <CheckCircle2 size={18} style={{ color: "#22c55e" }} />}
            <div>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", color: stats.errors > 0 ? "#ef4444" : "#22c55e" }}>
                {stats.errors > 0 ? `${stats.errors} FEHLER GEFUNDEN` : "ALLE CHECKS BESTANDEN"}
              </p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-condensed)", letterSpacing: "0.05em" }}>
                {stats.ok} OK · {stats.auth} Auth fehlt · {stats.errors} Fehler · Ø {Math.round(stats.avgMs)}ms
              </p>
            </div>
          </div>
          {stats.errors > 0 && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-condensed)", letterSpacing: "0.06em" }}>Fehlerhafte Endpunkte aufklappen für Details</span>}
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          { color: "#22c55e", label: "Verbindung OK" },
          { color: "#ef4444", label: "Fehler" },
          { color: "#FFC107", label: "Auth fehlt" },
          { color: "#CA0C85", label: "Läuft" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
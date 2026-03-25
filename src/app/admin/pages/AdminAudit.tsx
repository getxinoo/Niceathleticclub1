/**
 * AdminAudit.tsx – DSGVO-konformes System-Audit-Log
 * ─────────────────────────────────────────────────────────────────────────────
 * Erfasst ALLE Aktionen im System: CronJobs, Automationen, Admin-UI,
 * Member-UI, API-Zugriffe, Staff-Aktionen.
 *
 * DSGVO-Features:
 *  • Jede Identität hat genau eine UUID (rollenübergreifend, permanent)
 *  • DSGVO-Modus: erzwingt UUID-only Anzeige (keine Klarnamen)
 *  • Pseudonymisierte Einträge zeigen immer nur UUID
 *  • CSV-Export berücksichtigt DSGVO-Modus
 *  • IP-Adressen werden maskiert angezeigt (erste 2 Oktette)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldOff, ShieldCheck, UserPlus, Dumbbell, Users,
  CreditCard, Trash2, Pencil, Activity, RefreshCw,
  Search, X, ChevronDown, Loader2, SlidersHorizontal,
  Clock, ChevronRight, Timer, Server, User, LogIn,
  FileText, Landmark, AlertTriangle, Download, Eye, EyeOff,
  Copy, Check, Zap, Key, CalendarDays, Database,
} from "lucide-react";
import { api, type AuditLog } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Sheet, SheetContent,
} from "@/app/components/ui/sheet";
import { toast } from "sonner";

// ── Actor-Typ Meta ────────────────────────────────────────────────────────────
const ACTOR_META: Record<string, { label: string; color: string; bg: string }> = {
  admin:  { label: "ADMIN",  color: "#CA0C85",              bg: "rgba(202,12,133,0.12)"   },
  staff:  { label: "STAFF",  color: "#60a5fa",              bg: "rgba(96,165,250,0.12)"   },
  member: { label: "MEMBER", color: "#a78bfa",              bg: "rgba(167,139,250,0.12)"  },
  cron:   { label: "CRON",   color: "#4ade80",              bg: "rgba(74,222,128,0.12)"   },
  system: { label: "SYSTEM", color: "rgba(255,255,255,0.5)",bg: "rgba(255,255,255,0.06)"  },
  api:    { label: "API",    color: "#f59e0b",              bg: "rgba(245,158,11,0.12)"   },
};

// ── Source Meta ───────────────────────────────────────────────────────────────
const SOURCE_META: Record<string, { label: string; color: string }> = {
  admin_ui:  { label: "Admin UI",  color: "#60a5fa" },
  member_ui: { label: "Member UI", color: "#a78bfa" },
  cron:      { label: "CronJob",   color: "#4ade80" },
  system:    { label: "System",    color: "rgba(255,255,255,0.35)" },
  api:       { label: "API",       color: "#f59e0b" },
};

// ── Severity Meta ─────────────────────────────────────────────────────────────
const SEVERITY_META: Record<string, { color: string; label: string; bg: string }> = {
  info:     { color: "rgba(255,255,255,0.25)", label: "Info",     bg: "rgba(255,255,255,0.04)"  },
  warning:  { color: "#f97316",               label: "Warnung",  bg: "rgba(249,115,22,0.08)"   },
  critical: { color: "#f87171",               label: "Kritisch", bg: "rgba(248,113,113,0.08)"  },
};

// ── Filter-Optionen ───────────────────────────────────────────────────────────
const ACTOR_OPTIONS  = [
  { value: "",       label: "Alle Akteure" },
  { value: "admin",  label: "Admin"        },
  { value: "staff",  label: "Staff"        },
  { value: "member", label: "Member"       },
  { value: "cron",   label: "CronJob"      },
  { value: "system", label: "System"       },
  { value: "api",    label: "API"          },
];
const SOURCE_OPTIONS = [
  { value: "",          label: "Alle Quellen" },
  { value: "admin_ui",  label: "Admin UI"     },
  { value: "member_ui", label: "Member UI"    },
  { value: "cron",      label: "CronJob"      },
  { value: "system",    label: "System"       },
  { value: "api",       label: "API"          },
];
const SEVERITY_OPTIONS = [
  { value: "",         label: "Alle Stufen" },
  { value: "info",     label: "Info"        },
  { value: "warning",  label: "Warnung"     },
  { value: "critical", label: "Kritisch"    },
];
const ENTITY_OPTIONS = [
  { value: "",              label: "Alle Typen"      },
  { value: "auth",          label: "Auth / Session"  },
  { value: "member",        label: "Mitglieder"      },
  { value: "course",        label: "Kurse"           },
  { value: "booking",       label: "Buchungen"       },
  { value: "lead",          label: "Leads"           },
  { value: "invoice",       label: "Rechnungen"      },
  { value: "sepa",          label: "SEPA"            },
  { value: "sepa_mandate",  label: "SEPA-Mandate"    },
  { value: "inkasso",       label: "Inkasso"         },
  { value: "settings",      label: "Einstellungen"   },
  { value: "tarif",         label: "Tarife"          },
  { value: "team",          label: "Team"            },
  { value: "press",         label: "Presse"          },
  { value: "cron",          label: "Cron / Backup"   },
];

// ── Aktion → Action-Icon ──────────────────────────────────────────────────────
function getActionMeta(action: string, entityType: string, actorType: string): {
  icon: React.ElementType; color: string; label: string;
} {
  const a = action.toLowerCase();
  const e = entityType.toLowerCase();

  if (actorType === "cron") {
    if (a.includes("sepa_collection_failed"))  return { icon: AlertTriangle, color: "#f87171", label: "SEPA-Einzug fehlgeschlagen" };
    if (a.includes("sepa_collection"))         return { icon: Landmark,      color: "#4ade80", label: "SEPA-Einzug Batch"          };
    if (a.includes("dunning"))                 return { icon: CreditCard,    color: "#f97316", label: "Auto-Mahnlauf"              };
    if (a.includes("google_reviews"))          return { icon: Activity,      color: "#4ade80", label: "Reviews-Cache"              };
    if (a.includes("session_cleanup"))         return { icon: Timer,         color: "#4ade80", label: "Session-Cleanup"            };
    if (a.includes("backup"))                  return { icon: Database,      color: "#4ade80", label: "Datenbank-Backup"           };
    return { icon: Zap, color: "#4ade80", label: "CronJob" };
  }
  if (actorType === "system") {
    if (a.includes("auto_freeze"))             return { icon: ShieldOff,     color: "#f97316", label: "Auto-Einfrierung"           };
    if (a.includes("auto_status"))             return { icon: Activity,      color: "rgba(255,255,255,0.4)", label: "Auto-Status" };
    if (a.includes("jwt") || a.includes("token")) return { icon: Key,        color: "rgba(255,255,255,0.4)", label: "JWT-Cleanup" };
    return { icon: Server, color: "rgba(255,255,255,0.4)", label: "System-Aktion" };
  }
  if (a.includes("unblock")  || a.includes("entsperr")) return { icon: ShieldCheck, color: "#4ade80",   label: "Entsperrung"        };
  if (a.includes("block")    || a.includes("sperr"))     return { icon: ShieldOff,   color: "#f87171",   label: "Sperrung"           };
  if (a.includes("escalate") || a.includes("inkasso"))   return { icon: AlertTriangle,color:"#f87171",   label: "Inkasso-Eskalation" };
  if (a.includes("data_export"))                          return { icon: Download,    color: "#f87171",   label: "Datenexport"        };
  if (a.includes("revoke_mandate"))                       return { icon: Landmark,    color: "#f87171",   label: "Mandat widerrufen"  };
  if (a.includes("storno"))                               return { icon: Trash2,      color: "#f87171",   label: "Storno"             };
  if (a.includes("delete"))                               return { icon: Trash2,      color: "#f87171",   label: "Löschung"           };
  if (a.includes("convert_lead"))                         return { icon: UserPlus,    color: "#CA0C85",   label: "Lead konvertiert"   };
  if (a.includes("create_member"))                        return { icon: UserPlus,    color: "#CA0C85",   label: "Mitglied erstellt"  };
  if (a.includes("password_change"))                      return { icon: Key,         color: "#f97316",   label: "Passwort geändert"  };
  if (a.includes("sepa_update") || a.includes("update_iban")) return { icon: Landmark,color: "#f97316",  label: "IBAN geändert"      };
  if (a.includes("create_mandate"))                       return { icon: Landmark,    color: "#60a5fa",   label: "SEPA-Mandat"        };
  if (a.includes("update_tarif"))                         return { icon: CreditCard,  color: "#f97316",   label: "Tarif geändert"     };
  if (a.includes("contract_upgrade"))                     return { icon: FileText,    color: "#a78bfa",   label: "Vertrag geändert"   };
  if (a.includes("dunning"))                              return { icon: CreditCard,  color: "#f97316",   label: "Mahnlauf"           };
  if (a.includes("approve_pause"))                        return { icon: Pencil,      color: "#60a5fa",   label: "Pausierung"         };
  if (a.includes("process_termination"))                  return { icon: FileText,    color: "#f97316",   label: "Kündigung"          };
  if (e.includes("course") || e.includes("kurs"))         return { icon: Dumbbell,    color: "#60a5fa",   label: "Kurs"               };
  if (a.includes("book_course") || a.includes("cancel_booking")) return { icon: CalendarDays, color: "#a78bfa", label: "Buchung"    };
  if (e.includes("lead"))                                 return { icon: Users,       color: "#f59e0b",   label: "Lead"               };
  if (e.includes("invoice") || a.includes("invoice") || a.includes("paid")) return { icon: CreditCard, color: "#f97316", label: "Rechnung" };
  if (a.includes("login"))                                return { icon: LogIn,       color: "rgba(255,255,255,0.4)", label: "Login" };
  if (a.includes("profile_update"))                       return { icon: User,        color: "rgba(255,255,255,0.4)", label: "Profil" };
  if (a.includes("update_settings"))                      return { icon: Pencil,      color: "#f97316",   label: "Einstellungen"      };
  if (a.includes("update") || a.includes("edit"))         return { icon: Pencil,      color: "rgba(255,255,255,0.4)", label: "Bearbeitung" };
  return { icon: Activity, color: "rgba(255,255,255,0.2)", label: "System-Aktion" };
}

// ── DSGVO: IP maskieren (nur erste 2 Oktette) ─────────────────────────────────
function maskIp(ip: string | null): string {
  if (!ip) return "–";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return "****";
}

// ── DSGVO: Anzeige-Name auflösen ──────────────────────────────────────────────
function resolveActor(log: AuditLog, gdprMode: boolean): { display: string; isUuid: boolean } {
  if (gdprMode || log.gdpr_pseudonymized || !log.user_name) {
    return { display: log.uuid, isUuid: true };
  }
  return { display: log.user_name, isUuid: false };
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCsv(logs: AuditLog[], gdprMode: boolean) {
  const cols = ["ID","UUID","Akteur","Akteur Typ","Rolle","Quelle","Schwere",
                "Aktion","Entitätstyp","Entity-ID","IP (maskiert)","Timestamp"];
  const rows = logs.map(l => [
    l.id, l.uuid,
    gdprMode || l.gdpr_pseudonymized ? l.uuid : (l.user_name ?? l.uuid),
    l.actor_type, l.actor_role ?? "", l.source, l.severity,
    l.action, l.entity_type, l.entity_id,
    maskIp(l.ip_address), l.timestamp,
  ]);
  const csv = [cols, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv, ""], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `audit-log-${new Date().toISOString().slice(0,10)}${gdprMode ? "-dsgvo" : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${logs.length} Einträge exportiert${gdprMode ? " (DSGVO-Modus)" : ""}`);
}

// ── Sub-Komponente: Mini-Badge ────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      padding:       "2px 7px",
      background:    bg,
      border:        `1px solid ${color}30`,
      color,
      fontFamily:    "var(--font-condensed)",
      fontSize:      "9px",
      fontWeight:    700,
      letterSpacing: "0.14em",
      lineHeight:    1.4,
      whiteSpace:    "nowrap",
    }}>
      {label}
    </span>
  );
}

// ── Sub-Komponente: NacSelect ─────────────────────────────────────────────────
function NacSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", color: "white",
          fontFamily: "var(--font-body)", fontSize: "13px",
          padding: "9px 32px 9px 12px", outline: "none",
          cursor: "pointer", width: "100%", height: "40px",
          transition: "border-color 0.2s",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
        onBlur={e  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        {children}
      </select>
      <ChevronDown size={13} style={{
        position: "absolute", right: "10px", top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none",
        color: "rgba(255,255,255,0.4)",
      }} />
    </div>
  );
}

// ── Sub-Komponente: KPI-Karte ─────────────────────────────────────────────────
function KpiCard({ label, value, color, icon: Icon }: {
  label: string; value: number | string; color: string; icon: React.ElementType;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
      padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px",
    }}>
      <div style={{
        width: "36px", height: "36px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}15`, border: `1px solid ${color}30`,
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", color: "white", lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Sub-Komponente: Copy UUID Button ─────────────────────────────────────────
function CopyUuid({ uuid }: { uuid: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(uuid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} title="UUID kopieren" style={{
      background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
      color: copied ? "#4ade80" : "rgba(255,255,255,0.3)", transition: "color 0.15s",
      display: "inline-flex", alignItems: "center",
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

// ── Sub-Komponente: JSON-Block ────────────────────────────────────────────────
function JsonBlock({ data, label }: { data: unknown; label?: string }) {
  return (
    <div>
      {label && (
        <p style={{
          fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
          letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase", marginBottom: "6px",
        }}>{label}</p>
      )}
      <pre style={{
        background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 14px", fontFamily: "'Courier New', monospace",
        fontSize: "11px", color: "rgba(255,255,255,0.65)",
        overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
        lineHeight: "1.65", margin: 0,
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

export default function AdminAudit() {
  const location = useLocation();
  const [logs, setLogs]               = useState<AuditLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<AuditLog | null>(null);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [visibleCount, setVisible]    = useState(PAGE_SIZE);

  // Filter-States
  const [search, setSearch]           = useState("");
  const [actorType, setActorType]     = useState("");
  const [source, setSource]           = useState("");
  const [severity, setSeverity]       = useState("");
  const [entityType, setEntityType]   = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // DSGVO-Modus: alle Namen → UUID
  const [gdprMode, setGdprMode]       = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.admin.audit.list();
      setLogs([...data].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch {
      toast.error("Audit-Log konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, location.key]);

  // ── Filter-Logik ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = log.user_name?.toLowerCase().includes(q);
        const uuidMatch = log.uuid.toLowerCase().includes(q);
        const entityMatch = log.entity_id.toLowerCase().includes(q);
        const actionMatch = log.action.toLowerCase().includes(q);
        if (!nameMatch && !uuidMatch && !entityMatch && !actionMatch) return false;
      }
      if (actorType && log.actor_type !== actorType) return false;
      if (source   && log.source     !== source)     return false;
      if (severity && log.severity   !== severity)   return false;
      if (entityType && !log.entity_type.toLowerCase().includes(entityType)) return false;
      if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(log.timestamp) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [logs, search, actorType, source, severity, entityType, dateFrom, dateTo]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  // ── KPI-Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const ms30 = 30 * 24 * 60 * 60 * 1000;
    return {
      total:        logs.length,
      critical:     logs.filter(l => l.severity === "critical" && (now - new Date(l.timestamp).getTime()) < ms30).length,
      cronJobs:     logs.filter(l => l.actor_type === "cron").length,
      pseudonymized:logs.filter(l => l.gdpr_pseudonymized).length,
    };
  }, [logs]);

  const hasFilters = !!(search || actorType || source || severity || entityType || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch(""); setActorType(""); setSource(""); setSeverity("");
    setEntityType(""); setDateFrom(""); setDateTo("");
    setVisible(PAGE_SIZE);
  };

  const openSheet = (log: AuditLog) => { setSelected(log); setSheetOpen(true); };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-4 sm:p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-white" style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem,4vw,2.8rem)",
            letterSpacing: "0.04em", lineHeight: 1, textTransform: "uppercase",
          }}>
            AUDIT<span style={{ color: "var(--brand)" }}>LOG</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            Vollständiges Aktivitätsprotokoll · DSGVO-konform · Alle Akteure
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {/* DSGVO-Modus Toggle */}
          <button
            onClick={() => setGdprMode(v => !v)}
            title={gdprMode ? "DSGVO-Modus aktiv: Klarnamen verborgen" : "DSGVO-Modus: nur UUIDs anzeigen"}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              height: "40px", padding: "0 14px",
              background: gdprMode ? "rgba(202,12,133,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${gdprMode ? "rgba(202,12,133,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: gdprMode ? "#CA0C85" : "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {gdprMode ? <EyeOff size={13} /> : <Eye size={13} />}
            DSGVO{gdprMode ? " AN" : ""}
          </button>

          <Button variant="outline" onClick={() => setShowFilters(v => !v)}
            style={{ gap: "6px", borderColor: showFilters ? "var(--brand)" : undefined, height: "40px" }}>
            <SlidersHorizontal size={13} />
            Filter
            {hasFilters && (
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--brand)", display: "inline-block", flexShrink: 0 }} />
            )}
          </Button>

          <Button variant="outline" onClick={() => exportCsv(filtered, gdprMode)}
            title="Als CSV exportieren" style={{ height: "40px", gap: "6px" }}>
            <Download size={13} />
            Export
          </Button>

          <Button variant="outline" onClick={loadData} disabled={loading}
            title="Neu laden" style={{ height: "40px" }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* ── KPI-Zeile ──────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Einträge gesamt"      value={stats.total}         color="rgba(255,255,255,0.4)" icon={Activity}      />
          <KpiCard label="Kritisch (30 Tage)"   value={stats.critical}      color="#f87171"              icon={AlertTriangle} />
          <KpiCard label="CronJob-Aktionen"     value={stats.cronJobs}      color="#4ade80"              icon={Timer}         />
          <KpiCard label="DSGVO-pseudonymisiert"value={stats.pseudonymized} color="#CA0C85"              icon={ShieldCheck}   />
        </div>
      )}

      {/* ── DSGVO-Info-Banner ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {gdprMode && (
          <motion.div
            key="gdpr-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.25)",
              padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px",
            }}>
              <ShieldCheck size={14} style={{ color: "#CA0C85", flexShrink: 0 }} />
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                <strong style={{ color: "#CA0C85" }}>DSGVO-Modus aktiv:</strong>{" "}
                Alle Klarnamen werden durch die einmalige UUID der Identität ersetzt.
                CSV-Export enthält ausschließlich UUIDs. Gilt gemäß Art. 4 DSGVO als Pseudonymisierung.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter-Panel ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            key="filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              padding: "16px", display: "grid",
              gridTemplateColumns: "1fr repeat(4, 145px)",
              gap: "10px", alignItems: "end",
            }} className="flex-col sm:grid">

              {/* Suche */}
              <div>
                <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"5px" }}>
                  Name / UUID / Aktion
                </p>
                <div style={{ position: "relative" }}>
                  <Search size={12} style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.25)", pointerEvents:"none" }} />
                  <Input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "30px" }} />
                </div>
              </div>

              {/* Akteur-Typ */}
              <div>
                <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"5px" }}>Akteur</p>
                <NacSelect value={actorType} onChange={v => { setActorType(v); setVisible(PAGE_SIZE); }}>
                  {ACTOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NacSelect>
              </div>

              {/* Quelle */}
              <div>
                <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"5px" }}>Quelle</p>
                <NacSelect value={source} onChange={v => { setSource(v); setVisible(PAGE_SIZE); }}>
                  {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NacSelect>
              </div>

              {/* Schwere */}
              <div>
                <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"5px" }}>Schwere</p>
                <NacSelect value={severity} onChange={v => { setSeverity(v); setVisible(PAGE_SIZE); }}>
                  {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NacSelect>
              </div>

              {/* Entitätstyp */}
              <div>
                <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"5px" }}>Typ</p>
                <NacSelect value={entityType} onChange={v => { setEntityType(v); setVisible(PAGE_SIZE); }}>
                  {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NacSelect>
              </div>
            </div>

            {/* Datumsbereich + Reset */}
            <div style={{
              background: "rgba(255,255,255,0.015)", borderLeft: "1px solid rgba(255,255,255,0.07)",
              borderRight: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)",
              padding: "10px 16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
            }}>
              <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", flexShrink:0 }}>Zeitraum:</p>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setVisible(PAGE_SIZE); }} style={{ colorScheme: "dark", width: "150px" }} />
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>bis</span>
              <Input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value);   setVisible(PAGE_SIZE); }} style={{ colorScheme: "dark", width: "150px" }} />
              {hasFilters && (
                <button onClick={clearFilters} style={{
                  marginLeft: "auto", background: "none", border: "none",
                  color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)",
                  fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                  transition: "color 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                >
                  <X size={11} /> Filter zurücksetzen
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats-Zeile ────────────────────────────────────────────────────── */}
      {!loading && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
          {filtered.length === logs.length
            ? `${logs.length} Einträge`
            : `${filtered.length} von ${logs.length} Einträgen`}
          {" "}· {visibleCount < filtered.length ? `${visibleCount} angezeigt · ` : ""}
          Klicke auf eine Zeile für Details
        </p>
      )}

      {/* ── Log-Liste ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        style={{ border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--brand)" }} />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "var(--font-body)" }}>
              Lade Audit-Log …
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity size={32} style={{ color: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px", fontFamily: "var(--font-body)" }}>
              Keine Einträge für die gewählten Filter.
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((log, idx) => {
              const meta   = getActionMeta(log.action, log.entity_type, log.actor_type);
              const Icon   = meta.icon;
              const actor  = resolveActor(log, gdprMode);
              const am     = ACTOR_META[log.actor_type]   ?? ACTOR_META.system;
              const sm     = SOURCE_META[log.source]       ?? { label: log.source, color: "rgba(255,255,255,0.3)" };
              const sev    = SEVERITY_META[log.severity]   ?? SEVERITY_META.info;
              const ts     = new Date(log.timestamp);
              const isToday = ts.toDateString() === new Date().toDateString();

              return (
                <motion.button
                  key={log.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(idx * 0.012, 0.3) }}
                  onClick={() => openSheet(log)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: "12px", padding: "12px 14px",
                    background: "transparent", border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Severity-Dot */}
                  <div style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: sev.color, flexShrink: 0,
                    boxShadow: log.severity === "critical" ? `0 0 6px ${sev.color}` : "none",
                  }} />

                  {/* Action-Icon */}
                  <div style={{
                    width: "32px", height: "32px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${meta.color}15`, border: `1px solid ${meta.color}25`,
                  }}>
                    <Icon size={14} style={{ color: meta.color }} />
                  </div>

                  {/* Mitte: Akteur + Aktion + Entity */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Akteur-Zeile */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "var(--font-body)", fontSize: "12px",
                        color: actor.isUuid ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)",
                        fontVariantNumeric: actor.isUuid ? "tabular-nums" : undefined,
                        maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {actor.display}
                      </span>
                      <Badge label={am.label} color={am.color} bg={am.bg} />
                      {log.actor_role && (
                        <Badge label={log.actor_role.toUpperCase()} color="rgba(255,255,255,0.4)" bg="rgba(255,255,255,0.04)" />
                      )}
                    </div>
                    {/* Aktion + Entity */}
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                      <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                      <span style={{ margin: "0 4px" }}>·</span>
                      <span style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{log.entity_type}</span>
                      <span style={{ margin: "0 4px", color: "rgba(255,255,255,0.2)" }}>#{String(log.entity_id ?? "").slice(0, 14)}</span>
                    </p>
                  </div>

                  {/* Source Badge + Timestamp */}
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: "90px" }}>
                    <span style={{
                      display: "inline-block", fontFamily: "var(--font-condensed)", fontSize: "9px",
                      fontWeight: 700, letterSpacing: "0.1em", color: sm.color,
                      padding: "2px 6px", border: `1px solid ${sm.color}30`,
                      background: `${sm.color}10`, marginBottom: "4px",
                    }}>
                      {sm.label}
                    </span>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: "3px", justifyContent: "flex-end" }}>
                      <Clock size={8} />
                      {isToday
                        ? ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                        : ts.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
                      }
                    </p>
                  </div>

                  <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Mehr laden ─────────────────────────────────────────────────────── */}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisible(v => v + PAGE_SIZE)} style={{ gap: "6px" }}>
            <ChevronDown size={13} />
            Weitere {Math.min(PAGE_SIZE, filtered.length - visibleCount)} laden
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
              ({visibleCount}/{filtered.length})
            </span>
          </Button>
        </div>
      )}

      {/* ── Detail-Sheet ───────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={o => !o && setSheetOpen(false)}>
        <SheetContent
          side="right"
          className="bg-[#0a0a0a] border-l border-white/10 text-white overflow-y-auto"
          style={{ width: "min(520px, 96vw)", maxWidth: "520px" }}
        >
          {selected && (() => {
            const meta   = getActionMeta(selected.action, selected.entity_type, selected.actor_type);
            const Icon   = meta.icon;
            const actor  = resolveActor(selected, gdprMode);
            const am     = ACTOR_META[selected.actor_type]  ?? ACTOR_META.system;
            const sm     = SOURCE_META[selected.source]      ?? { label: selected.source, color: "rgba(255,255,255,0.3)" };
            const sev    = SEVERITY_META[selected.severity]  ?? SEVERITY_META.info;
            const hasDiff = selected.details?.before !== undefined || selected.details?.after !== undefined;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{
                    width: "44px", height: "44px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${meta.color}12`, border: `1px solid ${meta.color}30`,
                  }}>
                    <Icon size={20} style={{ color: meta.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.06em", textTransform: "uppercase", color: "white", lineHeight: 1 }}>
                      {meta.label}
                    </p>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                      {new Date(selected.timestamp).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "medium" })}
                    </p>
                    {/* Severity-Badge */}
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "2px 8px", background: sev.bg, border: `1px solid ${sev.color}40`,
                        fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                        letterSpacing: "0.14em", color: sev.color,
                      }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: sev.color, display: "inline-block" }} />
                        {sev.label.toUpperCase()}
                      </span>
                      <span style={{
                        display: "inline-block", padding: "2px 8px",
                        background: `${sm.color}10`, border: `1px solid ${sm.color}30`,
                        fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                        letterSpacing: "0.14em", color: sm.color,
                      }}>
                        {sm.label.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── IDENTITÄT (DSGVO-Sektion) ──────────────────────────── */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", padding: "14px" }}>
                  <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"12px" }}>
                    Identität · DSGVO-konform
                  </p>

                  {/* UUID (immer sichtbar, prominent) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", padding: "10px 12px", background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.2)" }}>
                    <ShieldCheck size={13} style={{ color: "#CA0C85", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily:"var(--font-condensed)", fontSize:"8px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(202,12,133,0.7)", textTransform:"uppercase", marginBottom:"2px" }}>UUID (permanent · unveränderlich)</p>
                      <p style={{ fontFamily:"'Courier New',monospace", fontSize:"12px", color:"white", wordBreak:"break-all" }}>{selected.uuid}</p>
                    </div>
                    <CopyUuid uuid={selected.uuid} />
                  </div>

                  {/* Name / Pseudonymisiert */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontFamily:"var(--font-condensed)", fontSize:"8px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"3px" }}>Name</p>
                      {actor.isUuid ? (
                        <p style={{ fontFamily:"var(--font-body)", fontSize:"11px", color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>
                          {selected.gdpr_pseudonymized ? "Pseudonymisiert (DSGVO)" : "UUID-Modus aktiv"}
                        </p>
                      ) : (
                        <p style={{ fontFamily:"var(--font-body)", fontSize:"12px", color:"white" }}>{actor.display}</p>
                      )}
                    </div>
                    <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontFamily:"var(--font-condensed)", fontSize:"8px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"3px" }}>Akteur-Typ</p>
                      <Badge label={am.label} color={am.color} bg={am.bg} />
                    </div>
                    {selected.actor_role && (
                      <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontFamily:"var(--font-condensed)", fontSize:"8px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"3px" }}>RBAC-Rolle</p>
                        <p style={{ fontFamily:"var(--font-body)", fontSize:"12px", color:"white", textTransform:"capitalize" }}>{selected.actor_role}</p>
                      </div>
                    )}
                    {selected.user_id && (
                      <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontFamily:"var(--font-condensed)", fontSize:"8px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"3px" }}>DB-ID</p>
                        <p style={{ fontFamily:"'Courier New',monospace", fontSize:"12px", color:"rgba(255,255,255,0.5)" }}>{selected.user_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Aktion ─────────────────────────────────────────────── */}
                <div>
                  <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"10px" }}>Aktion</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {[
                      { label: "Aktion",      value: selected.action.replace(/_/g, " ") },
                      { label: "Entitätstyp", value: selected.entity_type               },
                      { label: "Entity-ID",   value: selected.entity_id                 },
                      { label: "Log-ID",      value: `#${selected.id}`                  },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontFamily:"var(--font-condensed)", fontSize:"8px", fontWeight:700, letterSpacing:"0.15em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"3px" }}>{label}</p>
                        <p style={{ fontFamily:"var(--font-body)", fontSize:"12px", color:"white", textTransform:"capitalize", wordBreak:"break-all" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Technische Metadaten ────────────────────────────────── */}
                {(selected.ip_address || selected.session_id || selected.user_agent) && (
                  <div>
                    <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"10px" }}>
                      Technische Daten · IP maskiert gem. DSGVO
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {selected.ip_address && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontFamily:"var(--font-condensed)", fontSize:"10px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em" }}>IP-ADRESSE</span>
                          <span style={{ fontFamily:"'Courier New',monospace", fontSize:"11px", color:"rgba(255,255,255,0.5)" }}>{maskIp(selected.ip_address)}</span>
                        </div>
                      )}
                      {selected.session_id && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontFamily:"var(--font-condensed)", fontSize:"10px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em" }}>SESSION-ID</span>
                          <span style={{ fontFamily:"'Courier New',monospace", fontSize:"11px", color:"rgba(255,255,255,0.5)" }}>{selected.session_id}</span>
                        </div>
                      )}
                      {selected.user_agent && (
                        <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontFamily:"var(--font-condensed)", fontSize:"10px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", display:"block", marginBottom:"4px" }}>USER-AGENT</span>
                          <span style={{ fontFamily:"'Courier New',monospace", fontSize:"10px", color:"rgba(255,255,255,0.4)", wordBreak:"break-all" }}>{selected.user_agent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Änderungs-Details ───────────────────────────────────── */}
                <div>
                  <p style={{ fontFamily:"var(--font-condensed)", fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:"10px" }}>
                    Änderungs-Details
                  </p>
                  {hasDiff ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selected.details.before !== undefined && (
                        <JsonBlock data={selected.details.before} label="— Vorher" />
                      )}
                      {selected.details.after !== undefined && (
                        <JsonBlock data={selected.details.after} label="+ Nachher" />
                      )}
                    </div>
                  ) : (
                    <JsonBlock data={selected.details} />
                  )}
                </div>

                {/* ── DSGVO-Fußnote ───────────────────────────────────────── */}
                <div style={{ padding: "10px 12px", background: "rgba(202,12,133,0.04)", border: "1px solid rgba(202,12,133,0.12)" }}>
                  <p style={{ fontFamily:"var(--font-body)", fontSize:"10px", color:"rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                    <ShieldCheck size={10} style={{ display:"inline", marginRight:"4px", color:"rgba(202,12,133,0.6)" }} />
                    Dieser Eintrag ist gem. Art. 5 Abs. 1 lit. f) DSGVO durch die unveränderliche UUID dauerhaft pseudonymisierbar.
                    IP-Adressen werden nach 90 Tagen vollständig gelöscht. Jede Identität trägt exakt eine UUID,
                    unabhängig von Rolle oder Zugangsberechtigung.
                  </p>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
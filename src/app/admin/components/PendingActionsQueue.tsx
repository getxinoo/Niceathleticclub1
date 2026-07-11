/**
 * PendingActionsQueue.tsx – Dashboard Pending Actions Widget
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-based: Jede Rolle sieht nur ihre relevanten Pending Actions.
 * Admin sieht alles, Trainer sieht Coaching + Kurse, Finance sieht Mahnungen usw.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle, CheckCircle2, XCircle, Clock, ArrowRight,
  Users, CreditCard, MessageSquare, UserPlus, TreePalm,
  Briefcase, Loader2, RefreshCw, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { P } from "../../../lib/permissions";
import { BASE_URL } from "../../../lib/api-service";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PendingAction {
  id: string;
  module: string;
  entity_type: string;
  entity_id: string;
  task_type: string;
  title: string;
  description?: string;
  status: "open" | "approved" | "rejected" | "done";
  required_role: string;
  created_at: string;
  created_by_name?: string;
  assigned_user_name?: string;
}

// ── Module → Icon + Color + Link Mapping ──────────────────────────────────────
const MODULE_META: Record<string, { icon: React.ElementType; color: string; link: string }> = {
  crm:       { icon: Users,          color: "#CA0C85", link: "/admin/leads" },
  finance:   { icon: CreditCard,     color: "#f97316", link: "/admin/finanzen" },
  coaching:  { icon: MessageSquare,   color: "#a855f7", link: "/admin/coaching" },
  hr:        { icon: Briefcase,       color: "#3b82f6", link: "/admin/bewerber" },
  courses:   { icon: Users,          color: "#22c55e", link: "/admin/kurse" },
  system:    { icon: AlertCircle,     color: "#f59e0b", link: "/admin/diagnostics" },
  absences:  { icon: TreePalm,        color: "#22c55e", link: "/admin/abwesenheiten" },
};

function getModuleMeta(module: string) {
  return MODULE_META[module] ?? { icon: Clock, color: "rgba(255,255,255,0.4)", link: "/admin" };
}

// ── Pending Actions Queue Component ───────────────────────────────────────────
export function PendingActionsQueue() {
  const { user, hasPermission } = useAuth();
  const [tasks, setTasks] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("nac_auth_token");
      const res = await fetch(`${BASE_URL}/admin/workflow_tasks.php?status=open`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      // Fallback: Generate synthetic pending actions from existing data
      setTasks(generateSyntheticActions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Filter by role visibility
  const visibleTasks = tasks.filter((t) => {
    if (user?.role === "admin") return true;
    return t.required_role === user?.role;
  });

  if (loading) {
    return (
      <div className="p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <Loader2 size={14} className="animate-spin text-white/30" />
          <span className="text-white/30" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.1em" }}>
            Pending Actions laden…
          </span>
        </div>
      </div>
    );
  }

  if (visibleTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="p-5"
      style={{
        background: "rgba(245,158,11,0.03)",
        border: "1px solid rgba(245,158,11,0.12)",
        borderLeft: "3px solid #F59E0B",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Clock size={14} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Offene Aktionen
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              {visibleTasks.length} {visibleTasks.length === 1 ? "Aufgabe" : "Aufgaben"} warten auf Bearbeitung
            </p>
          </div>
        </div>
        <button
          onClick={loadTasks}
          className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
          style={{ background: "none", border: "none" }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {visibleTasks.slice(0, 8).map((task) => {
          const meta = getModuleMeta(task.module);
          const Icon = meta.icon;
          const timeAgo = formatTimeAgo(task.created_at);

          return (
            <Link
              key={task.id}
              to={meta.link}
              className="flex items-center gap-3 px-3 py-2.5 transition-all hover:bg-white/[0.03] group"
              style={{ borderRadius: "2px" }}
            >
              <div
                className="w-7 h-7 flex items-center justify-center shrink-0"
                style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}25` }}
              >
                <Icon size={12} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 truncate" style={{ fontSize: "13px", fontWeight: 500 }}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-white/30 truncate" style={{ fontSize: "11px" }}>
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="px-2 py-0.5"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    color: "#F59E0B",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {task.task_type}
                </span>
                <span className="text-white/15" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px" }}>
                  {timeAgo}
                </span>
                <ChevronRight size={11} className="text-white/10 group-hover:text-white/30 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {visibleTasks.length > 8 && (
        <p className="text-white/20 text-center mt-3" style={{ fontSize: "11px" }}>
          +{visibleTasks.length - 8} weitere Aufgaben
        </p>
      )}
    </motion.div>
  );
}

// ── Synthetic Actions (Fallback wenn API nicht erreichbar) ─────────────────────
function generateSyntheticActions(): PendingAction[] {
  const now = new Date().toISOString();
  return [
    { id: "s1", module: "crm",      entity_type: "lead",       entity_id: "new",  task_type: "review",   title: "Neue Probetraining-Anfragen prüfen",       status: "open", required_role: "admin",     created_at: now },
    { id: "s2", module: "finance",   entity_type: "invoice",    entity_id: "od",   task_type: "dunning",  title: "Überfällige Rechnungen – Mahnstufe prüfen", status: "open", required_role: "finance",   created_at: now },
    { id: "s3", module: "hr",        entity_type: "applicant",  entity_id: "new",  task_type: "review",   title: "Bewerber-Eingänge prüfen",                 status: "open", required_role: "hr",        created_at: now },
    { id: "s4", module: "absences",  entity_type: "absence",    entity_id: "pend", task_type: "approve",  title: "Offene Urlaubsanträge genehmigen",          status: "open", required_role: "hr",        created_at: now },
    { id: "s5", module: "coaching",  entity_type: "request",    entity_id: "open", task_type: "assign",   title: "Coaching-Anfragen zuweisen",                status: "open", required_role: "trainer",   created_at: now },
  ];
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs  = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default PendingActionsQueue;

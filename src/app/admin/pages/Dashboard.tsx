/**
 * Dashboard.tsx – Admin-Dashboard mit echten Daten aus dem System
 * Alle Statistiken werden aus der Datenbank / API geladen – keine Dummy-Daten.
 */
import { api } from "../../../lib/api-service";
import { cn } from "../../../lib/utils";
import { PendingActionsQueue } from "../components/PendingActionsQueue";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart2,
  Clock,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Eye,
  Dumbbell,
  ShieldAlert,
  ShieldOff,
  ShieldCheck,
  UserPlus,
  CreditCard,
  Trash2,
  Activity,
  TreePalm,
  Stethoscope,
  GraduationCap,
  CalendarDays,
  AlertTriangle,
  FileText,
  Target,
  Layers,
  HeartPulse,
  Star,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/ui/DataTable";
import type { Lead, Booking, Invoice, AuditLog, Course, Member, DashboardStats } from "../../../lib/api-service";

// ── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  leads: Lead[];
  members: Member[];
  courses: Course[];
  bookings: Booking[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  staff: any[];
  absences: any[];
  coaching: any[];
  reviews: { reviews: any[]; stats: any } | null;
  requests: { pauses: any[]; terminations: any[] } | null;
}

/** Pre-aggregated KPIs from /dashboard.php (fast first paint) */
interface QuickKpis {
  newLeads7d: number;
  newLeads7dDelta: number;
  courseOccupancy: number;
  courseOccupancyDelta: number;
  activeMembers: number;
  activeMembersDelta: number;
  openRequests: number;
  openRequestsDelta: number;
  leadsPerDay: { date: string; count: number }[];
}

const GOAL_LABELS: Record<string, string> = {
  abnehmen: "Abnehmen",
  muskelaufbau: "Muskelaufbau",
  fitness: "Fitness",
  crossfit: "CrossFit",
};

// ── Dashboard Page ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickKpis, setQuickKpis] = useState<QuickKpis | null>(null);
  const [data, setData] = useState<DashboardData>({
    leads: [],
    members: [],
    courses: [],
    bookings: [],
    invoices: [],
    auditLogs: [],
    staff: [],
    absences: [],
    coaching: [],
    reviews: null,
    requests: null,
  });

  // ── Phase 1: Quick KPIs from aggregated /dashboard.php ─────────────────
  const loadQuickKpis = useCallback(async () => {
    try {
      const kpis = await api.admin.dashboard.stats();
      setQuickKpis(kpis);
    } catch {
      // Will fall back to client-computed stats
    }
    setLoading(false);
  }, []);

  // ── Phase 2: Detail data for tables, charts, audit log ─────────────────
  const loadDetailData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setDetailLoading(true);

    try {
      const [
        leads,
        members,
        courses,
        bookings,
        invoices,
        auditLogs,
        staff,
        absences,
        coaching,
        reviews,
        requests,
      ] = await Promise.allSettled([
        api.admin.leads.list(),
        api.admin.members.list(),
        api.admin.courses.list(),
        api.admin.bookings.list(),
        api.admin.finances.invoices(),
        api.admin.audit.list(),
        api.admin.users.listTeam(),
        api.admin.absences.list(),
        api.admin.coaching.list(),
        api.admin.reviews.getAll(),
        api.admin.requests.getAll(),
      ]);

      setData({
        leads: leads.status === "fulfilled" ? (leads.value ?? []) : [],
        members: members.status === "fulfilled" ? (members.value ?? []) : [],
        courses: courses.status === "fulfilled" ? (courses.value ?? []).filter((c: any) => c.active !== false) : [],
        bookings: bookings.status === "fulfilled" ? (bookings.value ?? []) : [],
        invoices: invoices.status === "fulfilled" ? (invoices.value ?? []) : [],
        auditLogs: auditLogs.status === "fulfilled" ? (auditLogs.value ?? []) : [],
        staff: staff.status === "fulfilled" ? (staff.value ?? []) : [],
        absences: absences.status === "fulfilled" ? (absences.value ?? []) : [],
        coaching: coaching.status === "fulfilled" ? (coaching.value ?? []) : [],
        reviews: reviews.status === "fulfilled" ? (reviews.value ?? null) : null,
        requests: requests.status === "fulfilled" ? (requests.value ?? null) : null,
      });
    } catch {
      // Partial data is fine
    }

    setDetailLoading(false);
    setRefreshing(false);
  }, []);

  // ── Full refresh (both phases) ─────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadQuickKpis(), loadDetailData(true)]);
  }, [loadQuickKpis, loadDetailData]);

  useEffect(() => {
    // Phase 1 (fast) + Phase 2 (detail) parallel
    loadQuickKpis();
    loadDetailData();
  }, [loadQuickKpis, loadDetailData, location.key]);

  // ── Computed Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const { leads, members, courses, bookings, invoices, absences, coaching, requests, staff } = data;

    // Leads
    const newLeads = leads.filter((l) => l.status === "Neu");
    const contactedLeads = leads.filter((l) => l.status === "Kontaktiert");
    const confirmedLeads = leads.filter((l) => l.status === "Bestätigt");

    // Members
    const activeMembers = members.filter((m) => m.status === "active");
    const frozenMembers = members.filter((m) => m.status === "frozen");
    const terminatedMembers = members.filter((m) => m.status === "terminated");

    // Courses - Auslastung berechnen
    const courseCount = courses.length;
    const totalCapacity = courses.reduce((s, c) => s + (c.capacity || 16), 0);
    const totalEnrolled = courses.reduce((s, c) => s + (c.enrolled || 0), 0);
    const avgOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    // Course categories
    const courseCats = courses.reduce<Record<string, { count: number; enrolled: number; capacity: number }>>((acc, c) => {
      const cat = c.category || "Sonstige";
      if (!acc[cat]) acc[cat] = { count: 0, enrolled: 0, capacity: 0 };
      acc[cat].count += 1;
      acc[cat].enrolled += c.enrolled || 0;
      acc[cat].capacity += c.capacity || 16;
      return acc;
    }, {});

    // Bookings stats
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
    const attendedBookings = bookings.filter((b) => b.status === "attended");
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled");
    const noShows = bookings.filter((b) => b.status === "no-show");
    const guestBookings = bookings.filter((b) => b.booking_type === "guest");

    // Finances
    const openInvoices = invoices.filter((i) => i.status === "open");
    const overdueInvoices = invoices.filter((i) => i.status === "overdue");
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalOpen = openInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.amount || 0), 0);

    // Absences - today/this week
    const today = new Date().toISOString().split("T")[0];
    const activeAbsences = absences.filter((a: any) => {
      return a.status === "genehmigt" && a.startDate <= today && a.endDate >= today;
    });
    const pendingAbsences = absences.filter((a: any) => a.status === "beantragt");
    const sickToday = activeAbsences.filter((a: any) => a.type === "krank");
    const vacationToday = activeAbsences.filter((a: any) => a.type === "urlaub");
    const trainingToday = activeAbsences.filter((a: any) => a.type === "fortbildung");

    // Coaching
    const openCoaching = coaching.filter((c: any) => c.status === "open");
    const inProgressCoaching = coaching.filter((c: any) => c.status === "in_progress");
    const completedCoaching = coaching.filter((c: any) => c.status === "completed");

    // Open requests (pauses + terminations)
    const pendingPauses = requests?.pauses?.filter((p: any) => p.status === "pending") ?? [];
    const pendingTerminations = requests?.terminations?.filter((t: any) => t.status === "pending") ?? [];
    const totalOpenRequests = newLeads.length + pendingPauses.length + pendingTerminations.length + pendingAbsences.length;

    // Staff
    const activeStaff = staff.filter((s: any) => s.active);

    // Leads per day (last 7 days)
    const leadsPerDay = getLeadsPerDay(leads);

    return {
      newLeads, contactedLeads, confirmedLeads,
      activeMembers, frozenMembers, terminatedMembers,
      courseCount, totalCapacity, totalEnrolled, avgOccupancy, courseCats,
      confirmedBookings, attendedBookings, cancelledBookings, noShows, guestBookings,
      openInvoices, overdueInvoices, paidInvoices, totalRevenue, totalOpen, totalOverdue,
      activeAbsences, pendingAbsences, sickToday, vacationToday, trainingToday,
      openCoaching, inProgressCoaching, completedCoaching,
      pendingPauses, pendingTerminations, totalOpenRequests,
      activeStaff,
      leadsPerDay,
    };
  }, [data]);

  // ── Lead Table Columns ──────────────────────────────────────────────────
  const LEAD_COLUMNS: Column<Lead>[] = useMemo(() => [
    {
      key: "name",
      header: "Name",
      sortKey: "name",
      cell: (row) => (
        <span className="text-white/90" style={{ fontWeight: 500 }}>
          {row.name}
        </span>
      ),
    },
    {
      key: "goal",
      header: "Ziel",
      sortKey: "goal",
      cell: (row) => (
        <span className="text-white/55">
          {GOAL_LABELS[row.goal] ?? row.goal}
        </span>
      ),
    },
    {
      key: "desiredDate",
      header: "Wunschtermin",
      sortKey: "desiredDate",
      cell: (row) => (
        <span className="text-white/55">
          {row.desiredDate ? new Date(row.desiredDate).toLocaleDateString("de-DE", {
            day: "2-digit", month: "2-digit", year: "numeric",
          }) : "–"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Eingegangen",
      sortKey: "createdAt",
      cell: (row) => (
        <span className="text-white/35" style={{ fontSize: "12px" }}>
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("de-DE", {
            day: "2-digit", month: "2-digit", year: "numeric",
          }) : "–"}
        </span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <RefreshCw size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
          <p className="text-white/40" style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Dashboard wird geladen…
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* ── Page Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            WILLKOMMEN ZURÜCK,{" "}
            <span style={{ color: "var(--brand)" }}>{user?.name?.split(" ")[0]?.toUpperCase() ?? "ADMIN"}</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
            {" · "}Daten live aus dem System
          </p>
        </div>

        <button
          className="inline-flex items-center gap-2 px-4 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            fontFamily: "var(--font-condensed)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            minHeight: "44px",
          }}
          onClick={() => refreshAll()}
          disabled={refreshing}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Lädt…" : "Aktualisieren"}
        </button>
      </div>

      {/* ── Pending Actions Queue (role-based) ── */}
      <PendingActionsQueue />

      {/* ── Alert Banner ── */}
      {stats.totalOpenRequests > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: "rgba(202,12,133,0.07)",
            border: "1px solid rgba(202,12,133,0.2)",
            borderLeft: "3px solid var(--brand)",
          }}
        >
          <MessageSquare size={15} style={{ color: "var(--brand)", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
            <span className="text-white" style={{ fontWeight: 600 }}>
              {stats.newLeads.length} neue Leads
            </span>
            {stats.pendingPauses.length > 0 && <>, <span className="text-white" style={{ fontWeight: 600 }}>{stats.pendingPauses.length} Pausen-Anträge</span></>}
            {stats.pendingTerminations.length > 0 && <>, <span className="text-white" style={{ fontWeight: 600 }}>{stats.pendingTerminations.length} Kündigungen</span></>}
            {stats.pendingAbsences.length > 0 && <>, <span className="text-white" style={{ fontWeight: 600 }}>{stats.pendingAbsences.length} Urlaubsanträge</span></>}
            {" "}warten auf Bearbeitung.
          </p>
          <Link
            to="/admin/leads"
            className="ml-auto flex items-center gap-1 hover:text-brand transition-colors"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--brand)",
              flexShrink: 0,
            }}
          >
            Bearbeiten
            <ArrowRight size={11} />
          </Link>
        </motion.div>
      )}

      {/* ── Detail-Loading Indicator ── */}
      {detailLoading && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-2"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <RefreshCw size={11} className="animate-spin text-white/30" />
          <p className="text-white/30" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.1em" }}>
            Detail-Daten werden geladen…
          </p>
        </motion.div>
      )}

      {/* ── Row: Leads-Chart + Team Abwesenheiten ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="p-6 lg:col-span-2"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <SectionTitle>Leads diese Woche</SectionTitle>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
                Probetraining-Anfragen pro Tag ({data.leads.length} gesamt im System)
              </p>
            </div>
            <StatPill color="#4ade80" icon={TrendingUp}>
              {data.leads.length} Anfragen gesamt
            </StatPill>
          </div>
          <div style={{ height: "180px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.leadsPerDay} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs key="leadDefs">
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CA0C85" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#CA0C85" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  key="leadXAxis"
                  dataKey="day"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  key="leadYAxis"
                  tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip key="leadTooltip" content={<ChartTooltip unit="Leads" />} cursor={{ stroke: "rgba(202,12,133,0.3)", strokeWidth: 1 }} />
                <Area
                  key="leadArea"
                  type="monotone"
                  dataKey="count"
                  stroke="#CA0C85"
                  strokeWidth={2}
                  fill="url(#leadGrad)"
                  dot={{ fill: "#CA0C85", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#CA0C85" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Team Abwesenheiten Heute */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <IconBox color="#f59e0b" icon={CalendarDays} />
            <div>
              <SectionTitle>Team Status</SectionTitle>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                Heute, {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <AbsenceRow icon={Users} color="#22c55e" label="Im Dienst" count={stats.activeStaff.length - stats.activeAbsences.length} />
            <AbsenceRow icon={TreePalm} color="#22c55e" label="Urlaub" count={stats.vacationToday.length} names={stats.vacationToday.map((a: any) => a.staffName)} />
            <AbsenceRow icon={Stethoscope} color="#ef4444" label="Krank" count={stats.sickToday.length} names={stats.sickToday.map((a: any) => a.staffName)} />
            <AbsenceRow icon={GraduationCap} color="#3b82f6" label="Fortbildung" count={stats.trainingToday.length} names={stats.trainingToday.map((a: any) => a.staffName)} />

            {stats.pendingAbsences.length > 0 && (
              <div className="pt-3 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} style={{ color: "#f59e0b" }} />
                    <span className="text-white/50" style={{ fontSize: "12px" }}>
                      {stats.pendingAbsences.length} offene Anträge
                    </span>
                  </div>
                  <Link
                    to="/admin/abwesenheiten"
                    className="text-white/30 hover:text-brand transition-colors"
                    style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}
                  >
                    PRÜFEN →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Row: Finanzen + Kursauslastung ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Finanzen Übersicht */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <IconBox color="#f97316" icon={CreditCard} />
              <div>
                <SectionTitle>Finanzen</SectionTitle>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                  {data.invoices.length} Rechnungen im System
                </p>
              </div>
            </div>
            <Link to="/admin/finanzen" className="inline-flex items-center gap-1.5 px-3 text-white/40 hover:text-white/70 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "32px" }}>
              Details <ArrowRight size={10} />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <FinanceBlock label="Bezahlt" value={`${stats.totalRevenue.toLocaleString("de-DE")} €`} color="#22c55e" count={stats.paidInvoices.length} />
            <FinanceBlock label="Offen" value={`${stats.totalOpen.toLocaleString("de-DE")} €`} color="#f59e0b" count={stats.openInvoices.length} />
            <FinanceBlock label="Überfällig" value={`${stats.totalOverdue.toLocaleString("de-DE")} €`} color="#ef4444" count={stats.overdueInvoices.length} />
          </div>

          {data.invoices.length > 0 && (
            <div style={{ height: "80px" }}>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={getInvoiceChartData(data.invoices)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Bar key="barPaid" dataKey="paid" stackId="a" fill="#22c55e" opacity={0.6} radius={0} />
                  <Bar key="barOpen" dataKey="open" stackId="a" fill="#f59e0b" opacity={0.6} radius={0} />
                  <Bar key="barOverdue" dataKey="overdue" stackId="a" fill="#ef4444" opacity={0.6} radius={[2, 2, 0, 0]} />
                  <Tooltip key="barTooltip" content={<FinanceTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Kursauslastung nach Kategorie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <IconBox color="#3b82f6" icon={Dumbbell} />
              <div>
                <SectionTitle>Kursauslastung</SectionTitle>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                  {stats.totalEnrolled} / {stats.totalCapacity} Plätze belegt ({stats.avgOccupancy}%)
                </p>
              </div>
            </div>
            <Link to="/admin/kurse" className="inline-flex items-center gap-1.5 px-3 text-white/40 hover:text-white/70 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "32px" }}>
              Verwalten <ArrowRight size={10} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(() => {
              const COLORS: Record<string, string> = { CrossFit: "#CA0C85", Hyrox: "#f97316", Functional: "#3b82f6", Strength: "#22c55e", "Open Gym": "#a855f7" };
              return Object.entries(stats.courseCats).sort((a, b) => b[1].count - a[1].count).map(([cat, info]) => {
                const pct = info.capacity > 0 ? Math.round((info.enrolled / info.capacity) * 100) : 0;
                const color = COLORS[cat] || "#60a5fa";
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/60" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em" }}>{cat}</span>
                      <span className="text-white/30" style={{ fontSize: "11px" }}>
                        {info.enrolled}/{info.capacity} Plätze · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </motion.div>
      </div>

      {/* ── Row: Coaching + Buchungen + Mitglieder-Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coaching Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <IconBox color="#a855f7" icon={Target} />
              <SectionTitle>Coaching</SectionTitle>
            </div>
            <Link to="/admin/coaching" className="text-white/30 hover:text-brand transition-colors" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
              BOARD →
            </Link>
          </div>
          <div className="space-y-3">
            <MiniStat label="Offen" value={stats.openCoaching.length} color="#f59e0b" />
            <MiniStat label="In Bearbeitung" value={stats.inProgressCoaching.length} color="#3b82f6" />
            <MiniStat label="Abgeschlossen" value={stats.completedCoaching.length} color="#22c55e" />
          </div>
        </motion.div>

        {/* Buchungen */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <IconBox color="#22c55e" icon={Layers} />
              <SectionTitle>Buchungen</SectionTitle>
            </div>
            <Link to="/admin/buchungen" className="text-white/30 hover:text-brand transition-colors" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
              ALLE →
            </Link>
          </div>
          <div className="space-y-3">
            <MiniStat label="Bestätigt" value={stats.confirmedBookings.length} color="#22c55e" />
            <MiniStat label="Teilgenommen" value={stats.attendedBookings.length} color="#3b82f6" />
            <MiniStat label="Storniert" value={stats.cancelledBookings.length} color="#f59e0b" />
            <MiniStat label="No-Shows" value={stats.noShows.length} color="#ef4444" />
            <MiniStat label="Gast-Buchungen" value={stats.guestBookings.length} color="#a855f7" />
          </div>
        </motion.div>

        {/* Mitglieder-Status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <IconBox color="#22c55e" icon={Users} />
              <SectionTitle>Mitglieder</SectionTitle>
            </div>
            <Link to="/admin/mitglieder" className="text-white/30 hover:text-brand transition-colors" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
              ALLE →
            </Link>
          </div>
          <div className="space-y-3">
            <MiniStat label="Aktiv" value={stats.activeMembers.length} color="#22c55e" />
            <MiniStat label="Pausiert" value={stats.frozenMembers.length} color="#f59e0b" />
            <MiniStat label="Gekündigt" value={stats.terminatedMembers.length} color="#ef4444" />
          </div>
          {data.reviews?.stats && (
            <div className="pt-3 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <Star size={12} style={{ color: "#f59e0b" }} />
                <span className="text-white/40" style={{ fontSize: "11px" }}>
                  {data.reviews.stats.averageRating?.toFixed(1) ?? "–"} ★ Bewertung
                </span>
                <span className="text-white/20" style={{ fontSize: "10px" }}>
                  ({data.reviews.stats.totalReviews ?? data.reviews.reviews.length} Reviews)
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Leads Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.65 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionTitle>Letzte Probetraining-Anfragen</SectionTitle>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
              {data.leads.length} Einträge aus der Datenbank
            </p>
          </div>
          <Link
            to="/admin/leads"
            className="inline-flex items-center gap-2 px-4 text-white/50 hover:text-white/80 transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              minHeight: "36px",
            }}
          >
            <Eye size={12} />
            Alle anzeigen
          </Link>
        </div>
        <DataTable<Lead>
          columns={LEAD_COLUMNS}
          data={data.leads}
          keyField="id"
          pageSize={6}
          emptyMessage="Keine Leads vorhanden."
        />
      </motion.div>

      {/* ── Audit-Log ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="p-6"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <IconBox color="#f87171" icon={ShieldAlert} />
            <div>
              <SectionTitle>Audit-Log</SectionTitle>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                Letzte {Math.min(data.auditLogs.length, 10)} von {data.auditLogs.length} Aktivitäten
              </p>
            </div>
          </div>
          <Link to="/admin/audit" className="inline-flex items-center gap-1.5 px-3 text-white/40 hover:text-white/70 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "32px" }}>
            Alle Logs <ArrowRight size={10} />
          </Link>
        </div>

        <div className="space-y-1">
          {data.auditLogs.slice(0, 10).map((log) => {
            const { icon: LogIcon, color } = getAuditIcon(log.action);
            const timeStr = formatRelativeTime(log.timestamp);
            return (
              <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02]">
                <div className="w-7 h-7 flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <LogIcon size={12} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/70" style={{ fontSize: "13px", fontWeight: 500 }}>
                      {formatAuditAction(log.action)}
                    </span>
                    <span className="text-white/20" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.06em" }}>
                      {log.user_name ?? log.uuid.slice(0, 8) + "…"}
                    </span>
                  </div>
                  <p className="text-white/35 text-xs mt-0.5 truncate">
                    {formatAuditDetails(log)}
                  </p>
                </div>
                <span className="text-white/15 shrink-0 mt-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.06em" }}>
                  {timeStr}
                </span>
              </div>
            );
          })}
          {data.auditLogs.length === 0 && (
            <p className="text-white/20 text-center py-8" style={{ fontSize: "13px" }}>
              Keine Audit-Logs vorhanden.
            </p>
          )}
        </div>
      </motion.div>

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Sub-Components
// ════════════════════════════════════════════════════════════════════════════

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-white"
      style={{
        fontFamily: "var(--font-condensed)",
        fontSize: "14px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

function IconBox({ icon: Icon, color }: { icon: React.ComponentType<{ size?: number }>; color: string }) {
  return (
    <div
      className="w-9 h-9 flex items-center justify-center shrink-0"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <Icon size={15} style={{ color }} />
    </div>
  );
}

function StatPill({ color, icon: Icon, children }: { color: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1"
      style={{
        background: `${color}18`,
        color,
        fontFamily: "var(--font-condensed)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        border: `1px solid ${color}30`,
      }}
    >
      <Icon size={11} />
      {children}
    </span>
  );
}

function KpiCard({
  index,
  label,
  sublabel,
  value,
  delta,
  total,
  totalLabel,
  icon: Icon,
  color,
  sparkData,
  isWarning,
}: {
  index: number;
  label: string;
  sublabel: string;
  value: string;
  delta?: number;
  total?: number;
  totalLabel: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  sparkData: number[];
  isWarning?: boolean;
}) {
  const gradientId = `kpiGrad-${index}`;
  const min = Math.min(...(sparkData.length ? sparkData : [0]));
  const max = Math.max(...(sparkData.length ? sparkData : [0]));
  const sparkNorm = sparkData.map((v, i) => ({
    name: `sp-${index}-${i}`,
    i,
    v: max === min ? 50 : ((v - min) / (max - min)) * 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col justify-between overflow-hidden"
      style={{
        background: isWarning ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.02)",
        border: isWarning ? "1px solid rgba(245,158,11,0.15)" : "1px solid rgba(255,255,255,0.06)",
        padding: "20px",
        minHeight: "140px",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className="text-white/40 mb-0.5"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
          <p className="text-white/25" style={{ fontSize: "11px" }}>
            {sublabel}
          </p>
        </div>
        <div
          className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>

      <div className="flex items-end gap-3 mt-3">
        <span
          className="text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.2rem",
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          {value}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span
            className="inline-flex items-center gap-0.5 mb-1 px-1.5 py-0.5"
            style={{
              background: delta > 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: delta > 0 ? "#4ade80" : "#f87171",
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            {delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
        {total !== undefined && (
          <span className="text-white/20 mb-0.5" style={{ fontSize: "11px" }}>
            / {total.toLocaleString("de-DE")} {totalLabel}
          </span>
        )}
      </div>

      {sparkData.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0" style={{ height: "48px", opacity: 0.25 }}>
          <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={sparkNorm} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs key={`${gradientId}-defs`}>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area key={`${gradientId}-area`} type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

function AbsenceRow({ icon: Icon, color, label, count, names }: {
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  label: string;
  count: number;
  names?: string[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
        <Icon size={11} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white/60" style={{ fontSize: "12px", fontWeight: 500 }}>{label}</span>
          <span
            className="px-1.5 py-0.5"
            style={{
              background: count > 0 ? `${color}18` : "rgba(255,255,255,0.04)",
              color: count > 0 ? color : "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            {count}
          </span>
        </div>
        {names && names.length > 0 && (
          <p className="text-white/30 truncate" style={{ fontSize: "10px" }}>
            {names.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function FinanceBlock({ label, value, color, count }: { label: string; value: string; color: string; count: number }) {
  return (
    <div className="text-center">
      <p className="text-white/30 mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ color, fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1.2 }}>
        {value}
      </p>
      <p className="text-white/20 mt-0.5" style={{ fontSize: "10px" }}>
        {count} {count === 1 ? "Rechnung" : "Rechnungen"}
      </p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50" style={{ fontSize: "12px" }}>{label}</span>
      <span
        className="px-2 py-0.5"
        style={{
          background: value > 0 ? `${color}18` : "rgba(255,255,255,0.04)",
          color: value > 0 ? color : "rgba(255,255,255,0.3)",
          fontFamily: "var(--font-condensed)",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", color: "white" }}>
      <span style={{ color: "var(--brand)", fontWeight: 700 }}>{label}</span>
      <span className="ml-2 text-white/60">{payload[0].value} {unit ?? ""}</span>
    </div>
  );
}

function FinanceTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", fontSize: "11px", color: "white" }}>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ background: p.fill }} />
          <span className="text-white/60">{p.value.toLocaleString("de-DE")} €</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════════════════

function getLeadsPerDay(leads: Lead[]): { day: string; date: string; count: number }[] {
  const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const dayCounts: Record<string, number> = {};
  const dateKeys: string[] = [];

  // Initialize all 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const key = DAYS[d.getDay()];
    dayCounts[dateStr] = 0;
    dateKeys.push(dateStr);
  }

  // Count leads by date based on createdAt
  leads.forEach((l) => {
    if (!l.createdAt) return;
    const d = new Date(l.createdAt);
    const dateStr = d.toISOString().split("T")[0];
    if (dateStr in dayCounts) {
      dayCounts[dateStr] += 1;
    }
  });

  // Return in order of last 7 days
  return dateKeys.map((dateStr) => {
    const d = new Date(dateStr);
    return { day: DAYS[d.getDay()], date: dateStr, count: dayCounts[dateStr] || 0 };
  });
}

function getInvoiceChartData(invoices: Invoice[]): { name: string; paid: number; open: number; overdue: number }[] {
  // Group into a single bar for simplicity
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const open = invoices.filter((i) => i.status === "open").reduce((s, i) => s + (i.amount || 0), 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.amount || 0), 0);
  return [{ name: "total", paid, open, overdue }];
}

const AUDIT_ICONS: Record<string, { icon: React.ComponentType<{ size?: number }>; color: string }> = {
  login: { icon: ShieldCheck, color: "#22c55e" },
  update_member: { icon: Users, color: "#3b82f6" },
  block_member: { icon: ShieldOff, color: "#f87171" },
  unblock_member: { icon: ShieldCheck, color: "#22c55e" },
  create_member: { icon: UserPlus, color: "#CA0C85" },
  convert_lead: { icon: UserPlus, color: "#CA0C85" },
  update_course: { icon: Dumbbell, color: "#3b82f6" },
  create_course: { icon: Dumbbell, color: "#22c55e" },
  delete_course: { icon: Trash2, color: "#f87171" },
  create_invoice: { icon: CreditCard, color: "#f97316" },
  mark_paid: { icon: CreditCard, color: "#22c55e" },
  storno_invoice: { icon: CreditCard, color: "#f87171" },
  dunning_run: { icon: AlertTriangle, color: "#f59e0b" },
  create_lead: { icon: Users, color: "#f59e0b" },
  update_lead_status: { icon: Users, color: "#3b82f6" },
  update_settings: { icon: Activity, color: "#a855f7" },
  create_press: { icon: FileText, color: "#3b82f6" },
  approve_pause: { icon: Clock, color: "#f59e0b" },
  process_termination: { icon: ShieldOff, color: "#f87171" },
  update_tarif: { icon: CreditCard, color: "#a855f7" },
};

function getAuditIcon(action: string) {
  return AUDIT_ICONS[action] || { icon: Activity, color: "#60a5fa" };
}

const AUDIT_LABELS: Record<string, string> = {
  login: "Login",
  update_member: "Mitglied aktualisiert",
  block_member: "Mitglied gesperrt",
  unblock_member: "Mitglied entsperrt",
  create_member: "Mitglied angelegt",
  convert_lead: "Lead konvertiert",
  update_course: "Kurs geändert",
  create_course: "Neuer Kurs",
  delete_course: "Kurs gelöscht",
  create_invoice: "Rechnung erstellt",
  mark_paid: "Bezahlt markiert",
  storno_invoice: "Rechnung storniert",
  dunning_run: "Mahnlauf",
  create_lead: "Neuer Lead",
  update_lead_status: "Lead-Status geändert",
  update_settings: "Einstellungen geändert",
  create_press: "Presseberichte angelegt",
  approve_pause: "Pause genehmigt",
  process_termination: "Kündigung verarbeitet",
  update_tarif: "Tarif geändert",
};

function formatAuditAction(action: string): string {
  return AUDIT_LABELS[action] || action.replace(/_/g, " ");
}

function formatAuditDetails(log: AuditLog): string {
  const d = log.details as Record<string, any> | undefined;
  if (!d) return "";

  if (d.member) return `${d.member}`;
  if (d.name) return `${d.name}${d.goal ? ` · ${d.goal}` : ""}`;
  if (d.title) return `${d.title}`;
  if (d.lead_name) return `${d.lead_name}${d.contract_type ? ` → ${d.contract_type}` : ""}`;
  if (d.before && d.after) {
    const field = d.field || Object.keys(d.before)[0];
    return `${field}: ${JSON.stringify(d.before[field])} → ${JSON.stringify(d.after[field])}`;
  }
  if (d.ip) return `IP: ${d.ip} · ${d.device ?? ""}`;
  if (d.affected !== undefined) return `${d.affected} betroffen`;
  if (d.amount) return `${d.amount} €`;

  return "";
}

function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 1) return "Heute";
  if (diffDays === 1) return "Gestern";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}
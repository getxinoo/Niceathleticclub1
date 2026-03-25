import { useState, useEffect } from "react";
import nacLogo from "figma:asset/c836b0dc1e8ed6dd71de1118b818ee7b961a2cf5.png";
import { Outlet, useLocation, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCheck,
  Dumbbell,
  CreditCard,
  ShieldAlert,
  Settings,
  Inbox,
  LogOut,
  Menu,
  ChevronRight,
  Server,
  UsersRound,
  Cable,
  Search,
  Euro,
  Newspaper,
  CalendarCheck2,
  Star,
  Briefcase,
  UserPlus,
  CalendarDays,
  TreePalm,
  MessageSquare,
  Repeat2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { CommandPalette, useAdminShortcuts } from "../../components/ui/CommandPalette";
import { RoleBadge } from "../../components/ui/RoleBadge";
import { DevMockWarning } from "../../components/ui/AccessDenied";
import { P, type PermissionKey } from "../../../lib/permissions";

// ── Nav item type ─────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  permission?: PermissionKey;
}

// ── Grouped Sidebar Navigation (Permission-based) ─────────────────────────────
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "CRM & Kunden",
    items: [
      { label: "Dashboard",   href: "/admin",            icon: LayoutDashboard, exact: true, permission: P.DASHBOARD_VIEW },
      { label: "Leads",       href: "/admin/leads",      icon: Users,           permission: P.LEADS_READ },
      { label: "Mitglieder",  href: "/admin/mitglieder", icon: UserCheck,        permission: P.MEMBERS_READ },
      { label: "Antraege",    href: "/admin/antraege",   icon: Inbox,           permission: P.LEADS_WRITE },
    ],
  },
  {
    label: "Studio Management",
    items: [
      { label: "Kurse",        href: "/admin/kurse",      icon: Dumbbell,       permission: P.COURSES_READ },
      { label: "Buchungen",    href: "/admin/buchungen",  icon: CalendarCheck2,  permission: P.BOOKINGS_READ },
      { label: "Coaching",     href: "/admin/coaching",   icon: MessageSquare,   permission: P.COACHING_READ },
      { label: "Finanzen",     href: "/admin/finanzen",   icon: CreditCard,      permission: P.FINANCES_READ },
      { label: "Tarife",       href: "/admin/tarife",     icon: Euro,            permission: P.FINANCES_READ },
      { label: "Presse",       href: "/admin/presse",     icon: Newspaper,       permission: P.CMS_MANAGE },
      { label: "Bewertungen",  href: "/admin/reviews",    icon: Star,            permission: P.CMS_MANAGE },
    ],
  },
  {
    label: "HR & Einsatzplanung",
    items: [
      { label: "Team & Rechte",    href: "/admin/team",           icon: UsersRound,  permission: P.TEAM_MANAGE },
      { label: "Karriere",          href: "/admin/karriere",       icon: Briefcase,   permission: P.HR_READ },
      { label: "Bewerber-Zentrum",  href: "/admin/bewerber",       icon: UserPlus,    permission: P.HR_WRITE },
      { label: "Einsatzplan",       href: "/admin/einsatzplan",    icon: CalendarDays, permission: P.SHIFTS_READ },
      { label: "Abwesenheiten",     href: "/admin/abwesenheiten",  icon: TreePalm,    permission: P.ABSENCES_READ },
    ],
  },
  {
    label: "System & Setup",
    items: [
      { label: "Seiten",          href: "/admin/seiten",         icon: FileText,    permission: P.CMS_MANAGE },
      { label: "Einstellungen",    href: "/admin/einstellungen",  icon: Settings,    permission: P.SETTINGS_MANAGE },
      { label: "Integrationen",    href: "/admin/integrations",   icon: Cable,       permission: P.INTEGRATIONS_MANAGE },
      { label: "System-Check",     href: "/admin/diagnostics",    icon: Server,      permission: P.DIAGNOSTICS_VIEW },
      { label: "Audit-Log",        href: "/admin/audit",          icon: ShieldAlert, permission: P.AUDIT_READ },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const SIDEBAR_W = 256;
const HEADER_H  = 64;

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const { user, logout, hasPermission, isMockSession } = useAuth();

  const isVisible = (item: NavItem) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  };

  const isActive = (item: NavItem) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname.startsWith(item.href);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_GROUPS.map((g) => [g.label, true]))
  );

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  useEffect(() => {
    for (const group of NAV_GROUPS) {
      if (group.items.some(isActive)) {
        setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
        break;
      }
    }
  }, [location.pathname]);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "AD";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{
          height: `${HEADER_H}px`,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center shrink-0"
          style={{ background: "var(--brand)" }}
        >
          <img
            src={nacLogo}
            alt="NAC Logo"
            style={{ width: "22px", height: "22px", objectFit: "contain" }}
          />
        </div>
        <div>
          <p
            className="text-white"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              lineHeight: 1.2,
            }}
          >
            NAC ADMIN
          </p>
          <p
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            CMS v1.0
          </p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav
        aria-label="Admin navigation"
        className="flex-1 overflow-y-auto py-3 px-3"
      >
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          const isOpen      = openGroups[group.label] ?? true;
          const hasActive   = visibleItems.some(isActive);

          return (
            <div key={group.label} className={gi > 0 ? "mt-1" : ""}>
              {/* ── Klickbarer Gruppen-Header ── */}
              <button
                onClick={() => toggleGroup(group.label)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 group/hdr focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded-sm"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  paddingLeft: "14px",
                  paddingRight: "8px",
                  paddingTop: gi > 0 ? "14px" : "6px",
                  paddingBottom: "6px",
                  minHeight: "32px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    color: hasActive
                      ? "rgba(202,12,133,0.7)"
                      : "rgba(255,255,255,0.22)",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
                    flex: 1,
                    textAlign: "left",
                  }}
                  className="group-hover/hdr:!text-white/40"
                >
                  {group.label}
                </span>

                <AnimatePresence initial={false}>
                  {!isOpen && (
                    <motion.span
                      key="count"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        fontSize: "9px",
                        fontFamily: "var(--font-condensed)",
                        letterSpacing: "0.06em",
                        color: hasActive ? "var(--brand)" : "rgba(255,255,255,0.2)",
                        background: hasActive
                          ? "rgba(202,12,133,0.12)"
                          : "rgba(255,255,255,0.05)",
                        borderRadius: "3px",
                        padding: "1px 5px",
                        marginRight: "2px",
                      }}
                    >
                      {visibleItems.length}
                    </motion.span>
                  )}
                </AnimatePresence>

                <motion.span
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: hasActive
                      ? "rgba(202,12,133,0.6)"
                      : "rgba(255,255,255,0.18)",
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={11} />
                </motion.span>
              </button>

              <div
                style={{
                  height: "1px",
                  background: "rgba(255,255,255,0.04)",
                  marginBottom: "3px",
                  marginLeft: "14px",
                  marginRight: "4px",
                }}
              />

              <motion.div
                initial={false}
                animate={{
                  height: isOpen ? "auto" : 0,
                  opacity: isOpen ? 1 : 0,
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="space-y-0.5 pb-1">
                  {visibleItems.map((item) => {
                    const Icon   = item.icon;
                    const active = isActive(item);

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 transition-all duration-200 group relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
                          active ? "text-white" : "text-white/45 hover:text-white/80"
                        )}
                        style={{
                          minHeight: "40px",
                          borderRadius: "4px",
                          background: active ? "rgba(202,12,133,0.1)" : "transparent",
                          borderLeft: active
                            ? "2px solid var(--brand)"
                            : "2px solid transparent",
                          fontFamily: "var(--font-condensed)",
                          fontSize: "13px",
                          fontWeight: active ? 700 : 500,
                          letterSpacing: "0.1em",
                        }}
                        onMouseEnter={(e) => {
                          if (!active)
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Icon
                          size={15}
                          style={{ color: active ? "var(--brand)" : "inherit", flexShrink: 0 }}
                        />
                        {item.label}
                        {active && (
                          <ChevronRight
                            size={11}
                            className="ml-auto opacity-40"
                            style={{ color: "var(--brand)" }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          );
        })}
      </nav>

      {/* ── User Info + Logout ── */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Dev Mock Warning */}
        {isMockSession && (
          <div className="mb-2">
            <DevMockWarning />
          </div>
        )}

        {/* User row */}
        <div
          className="flex items-center gap-3 px-3 py-3 mb-1"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "4px",
          }}
        >
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0 text-white"
            style={{
              background: "rgba(202,12,133,0.2)",
              border: "1px solid rgba(202,12,133,0.3)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              letterSpacing: "0.04em",
              borderRadius: "2px",
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-white truncate"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {user?.name ?? "Admin"}
            </p>
            <p
              className="truncate"
              style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}
            >
              {user?.email ?? "admin@niceathleticclub.de"}
            </p>
          </div>
        </div>

        {/* Role Badge */}
        {user?.role && (
          <div className="px-3 mb-2">
            <RoleBadge role={user.role} size="sm" />
          </div>
        )}

        {/* Switch to Member Portal – admins always have access; others only if linked */}
        {(user?.role === 'admin' || user?.member_id) && (
          <Link
            to="/member"
            onClick={onClose}
            className="w-full flex items-center gap-2 px-3 mb-1 text-white/50 hover:text-white transition-colors duration-200 group/switch"
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "4px",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              minHeight: "36px",
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)";
              e.currentTarget.style.background = "rgba(202,12,133,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.background = "none";
            }}
          >
            <Repeat2
              size={13}
              style={{ color: "var(--brand)", flexShrink: 0 }}
            />
            <span>Member-Portal ansehen</span>
            <ChevronRight
              size={11}
              className="ml-auto opacity-0 group-hover/switch:opacity-60 transition-opacity"
              style={{ color: "var(--brand)" }}
            />
          </Link>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 text-white/35 hover:text-white/70 transition-colors duration-200 cursor-pointer"
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--font-condensed)",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            minHeight: "44px",
          }}
        >
          <LogOut size={14} />
          Abmelden
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar (always visible) ── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40"
        style={{
          width: `${SIDEBAR_W}px`,
          background: "#060606",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={onClose}
            />

            <motion.aside
              key="panel"
              initial={{ x: -SIDEBAR_W }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_W }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden flex flex-col"
              style={{
                width: `${SIDEBAR_W}px`,
                background: "#060606",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                overflowY: "auto",
              }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Admin Header ──────────────────────────────────────────────────────────────
function AdminHeader({ onMenuClick, onSearchClick }: { onMenuClick: () => void; onSearchClick: () => void }) {
  const location = useLocation();

  const current = ALL_NAV_ITEMS.find((item) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname.startsWith(item.href)
  );
  const pageTitle = current?.label ?? "Admin";

  return (
    <header
      className="sticky top-0 z-30 flex items-center px-6 gap-4"
      style={{
        height: `${HEADER_H}px`,
        background: "rgba(6,6,6,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <button
        className="md:hidden text-white/60 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        style={{
          background: "none",
          border: "none",
          width: "44px",
          height: "44px",
          flexShrink: 0,
        }}
        onClick={onMenuClick}
        aria-label="Navigation oeffnen"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2">
        <span
          className="text-white/20 hidden md:block"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "12px",
            letterSpacing: "0.1em",
          }}
        >
          NAC ADMIN
        </span>
        <span className="text-white/15 hidden md:block">/</span>
        <h1
          className="text-white"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {pageTitle}
        </h1>
      </div>

      <div className="flex-1" />

      <button
        onClick={onSearchClick}
        className="hidden sm:flex items-center gap-2 px-3 text-white/35 hover:text-white/60 transition-colors duration-200 cursor-pointer"
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          border: "1px solid rgba(255,255,255,0.07)",
          minHeight: "34px",
          borderRadius: "3px",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <Search size={13} />
        Suche...
        <kbd
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "3px",
            padding: "1px 5px",
            fontSize: "10px",
            fontFamily: "var(--font-condensed)",
            marginLeft: "4px",
          }}
        >
          {"\u2318"}K
        </kbd>
      </button>

      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center gap-2 px-3 text-white/35 hover:text-white/70 transition-colors duration-200"
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          border: "1px solid rgba(255,255,255,0.07)",
          minHeight: "34px",
          borderRadius: "3px",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Website ansehen
      </a>
    </header>
  );
}

// ── Root Layout ───────────────────────────────────────────────────────────────
export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { open: cmdOpen, setOpen: setCmdOpen } = useAdminShortcuts();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ background: "var(--surface-0)", minHeight: "100vh" }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      <div
        className="flex flex-col min-h-screen"
        style={{ marginLeft: 0 }}
      >
        <style>{`
          @media (min-width: 768px) {
            .admin-main { margin-left: ${SIDEBAR_W}px; }
          }
        `}</style>

        <div className="admin-main flex flex-col min-h-screen">
          <AdminHeader
            onMenuClick={() => setMobileOpen(true)}
            onSearchClick={() => setCmdOpen(true)}
          />

          <main className="flex-1 p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
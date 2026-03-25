/**
 * MemberLayout – Shell for the /member portal.
 *
 * Mobile  : Fixed bottom navigation (4 items) + safe-area padding.
 * Desktop : Fixed left sidebar (220 px) with nav items + user block.
 *
 * Touch-target minimum: 48 px on every interactive element.
 */

import { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  User,
  FileText,
  ChevronRight,
  Bell,
  Zap,
  LogOut,
  Activity,
  Clock,
  MessageSquare,
  Repeat2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { BlockedGuard } from "./BlockedGuard";
import { DemoBanner } from "../../components/ui/DemoBanner";

// ── Nav definition ────────────────────────────────────────────────────────────
const MEMBER_NAV = [
  { icon: LayoutDashboard, label: "Home",      href: "/member",           exact: true },
  { icon: Dumbbell,         label: "Kurse",     href: "/member/kurse"                 },
  { icon: CalendarDays,     label: "Buchungen", href: "/member/buchungen"             },
  { icon: Activity,         label: "Tracking",  href: "/member/tracking"              },
  { icon: MessageSquare,    label: "Coaching",  href: "/member/coaching"              },
  { icon: FileText,         label: "Vertrag",   href: "/member/vertrag"               },
  { icon: User,             label: "Profil",    href: "/member/profil"                },
] as const;

// Mobile bottom nav: max 5 items (exclude Vertrag — accessible via sidebar/Profil)
const MOBILE_NAV = [
  { icon: LayoutDashboard, label: "Home",      href: "/member",           exact: true },
  { icon: Dumbbell,         label: "Kurse",     href: "/member/kurse"                 },
  { icon: Activity,         label: "Tracking",  href: "/member/tracking"              },
  { icon: CalendarDays,     label: "Buchungen", href: "/member/buchungen"             },
  { icon: User,             label: "Profil",    href: "/member/profil"                },
] as const;

const SIDEBAR_W = 220;

// ── Active helper ────────────────────────────────────────────────────────────
function useIsActive(item: (typeof MEMBER_NAV)[number]) {
  const location = useLocation();
  return item.exact
    ? location.pathname === item.href
    : location.pathname.startsWith(item.href);
}

// ── Desktop Sidebar ───────────────────────────────────────────────────────────
function DesktopSidebar() {
  const location = useLocation();
  const { user, logout, hasStaffRole } = useAuth();

  const isActive = (item: (typeof MEMBER_NAV)[number]) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname.startsWith(item.href);

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40"
      style={{
        width: `${SIDEBAR_W}px`,
        background: "#060606",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo / Brand */}
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{
          height: "64px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center shrink-0"
          style={{ background: "var(--brand)" }}
        >
          <span
            className="text-white select-none"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              letterSpacing: "0.02em",
            }}
          >
            N
          </span>
        </div>
        <div>
          <p
            className="text-white"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              lineHeight: 1.2,
            }}
          >
            MEMBER PORTAL
          </p>
          <p
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            Nice Athletic Club
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-3">
        {MEMBER_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 transition-all duration-200",
                active ? "text-white" : "text-white/40 hover:text-white/75"
              )}
              style={{
                minHeight: "48px",
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
                size={16}
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
      </nav>

      {/* Check-in CTA */}
      <div className="px-3 pb-4">
        <Link
          to="/member"
          state={{ openCheckIn: true }}
          className="flex items-center justify-center gap-2 w-full text-white transition-all duration-200 cursor-pointer active:scale-[0.98]"
          style={{
            background: "var(--brand)",
            minHeight: "48px",
            fontFamily: "var(--font-condensed)",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            boxShadow: "0 0 20px rgba(202,12,133,0.35)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand)")}
        >
          <Zap size={13} />
          JETZT EINCHECKEN
        </Link>

        {/* Switch to Admin – only for staff */}
        {hasStaffRole() && (
          <Link
            to="/admin"
            className="flex items-center gap-2 w-full mt-2 px-3 text-white/50 hover:text-white transition-colors duration-200 group/switch"
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.07)",
              minHeight: "36px",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
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
            <Repeat2 size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
            <span>Admin-Bereich</span>
            <ChevronRight
              size={11}
              className="ml-auto opacity-0 group-hover/switch:opacity-60 transition-opacity"
              style={{ color: "var(--brand)" }}
            />
          </Link>
        )}

        {/* User stub */}
        <div
          className="flex items-center gap-3 mt-2 px-3 py-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0 text-white"
            style={{
              background: "rgba(202,12,133,0.2)",
              border: "1px solid rgba(202,12,133,0.3)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              borderRadius: "2px",
            }}
          >
            {user?.name?.slice(0, 2).toUpperCase() ?? "ME"}
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
              {user?.name ?? "Mitglied"}
            </p>
            <p
              className="truncate"
              style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
            >
              {user?.role === "admin" ? "Admin" : "Performance"}
            </p>
          </div>
          <button
            onClick={logout}
            title="Abmelden"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.25)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "32px",
              minHeight: "32px",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────
function BottomNav() {
  const location = useLocation();

  const isActive = (item: (typeof MEMBER_NAV)[number]) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname.startsWith(item.href);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      aria-label="Member navigation"
      style={{
        background: "rgba(6,6,6,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? location.pathname === item.href
          : location.pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            to={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative"
            style={{ minHeight: "60px" }}
            aria-current={active ? "page" : undefined}
          >
            {/* Icon */}
            <div
              className="flex items-center justify-center"
              style={{
                color: active ? "var(--brand)" : "rgba(255,255,255,0.35)",
                filter: active
                  ? "drop-shadow(0 0 8px rgba(202,12,133,0.65))"
                  : "none",
                transition: "all 0.25s ease",
              }}
            >
              <Icon size={22} />
            </div>

            {/* Label */}
            <span
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: active ? "var(--brand)" : "rgba(255,255,255,0.25)",
                transition: "color 0.25s ease",
              }}
            >
              {item.label}
            </span>

            {/* Active glow dot */}
            {active && (
              <motion.span
                layoutId="bottom-nav-dot"
                className="absolute bottom-2 w-1 h-1 rounded-full"
                style={{
                  background: "var(--brand)",
                  boxShadow: "0 0 6px rgba(202,12,133,0.9)",
                }}
                transition={{ duration: 0.25 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Mobile Admin Switch Bar – visible only for staff on mobile ────────────────
function MobileAdminSwitchBar() {
  const { hasStaffRole } = useAuth();
  if (!hasStaffRole()) return null;

  return (
    <Link
      to="/admin"
      className="md:hidden flex items-center justify-center gap-2 w-full"
      style={{
        background: "rgba(202,12,133,0.08)",
        borderBottom: "1px solid rgba(202,12,133,0.2)",
        minHeight: "40px",
        fontFamily: "var(--font-condensed)",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: "rgba(202,12,133,0.9)",
        textDecoration: "none",
      }}
    >
      <ShieldCheck size={13} />
      <span>Zum Admin-Bereich wechseln</span>
      <ChevronRight size={11} style={{ opacity: 0.6 }} />
    </Link>
  );
}

// ── Root Layout ───────────────────────────────────────────────────────────────
export function MemberLayout() {
  const location = useLocation();

  return (
    <div
      style={{ background: "var(--surface-0)", minHeight: "100dvh" }}
    >
      {/* Sperr-Overlay – überlagert alles bei is_blocked */}
      <BlockedGuard />

      <DesktopSidebar />
      <BottomNav />

      {/* Main content area */}
      <div
        className="flex flex-col min-h-screen"
        style={{
          // Desktop: push right of sidebar
          marginLeft: 0,
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            .member-main { margin-left: ${SIDEBAR_W}px; }
          }
        `}</style>

        <main
          className="member-main flex-1"
          style={{
            // Mobile: add padding for bottom nav + safe area
            paddingBottom:
              "calc(env(safe-area-inset-bottom, 0px) + 76px)",
          }}
        >
          {/* Mobile admin switch bar */}
          <MobileAdminSwitchBar />

          {/* Demo mode banner when API is unavailable */}
          <DemoBanner />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
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
  );
}
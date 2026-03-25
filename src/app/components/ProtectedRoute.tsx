/**
 * ProtectedRoute.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Route-Guards für das Admin-CMS und das Member-Portal.
 *
 * Verwendung in routes.ts (kein JSX nötig – Component: Notation):
 *
 *   { path: "/admin", Component: AdminGuard, children: [
 *     { Component: AdminLayout, children: [...] }
 *   ]}
 *
 * AdminGuard → rendert <Outlet /> wenn isAuthenticated + role === 'admin'
 * MemberGuard → rendert <Outlet /> wenn isAuthenticated (admin + member)
 *
 * Während des initialen Token-Checks (isLoading) wird ein Spinner gezeigt,
 * damit kein kurzes Flackern zur Login-Seite entsteht.
 */

import { Navigate, Outlet } from "react-router";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import ForcePasswordChange from "./ForcePasswordChange";
import { STAFF_ROLES } from "../../lib/permissions";
import type { StaffRole } from "../../lib/permissions";

// ── Loading Spinner ───────────────────────────────────────────────────────────
function AuthLoader() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "100vh", background: "#050505" }}
    >
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}
      >
        {/* NAC Logo Pulse */}
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="text-white select-none"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              letterSpacing: "0.02em",
            }}
          >
            N
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase",
          }}
        >
          Wird geladen…
        </p>
      </motion.div>
    </div>
  );
}

// ── Admin Guard ───────────────────────────────────────────────────────────────
/**
 * Schützt alle /admin/* Routen.
 * Nicht angemeldet → /login
 * Angemeldet als member → /member (kein Admin-Zugriff)
 * Angemeldet als Staff (admin, hr, finance, trainer, frontdesk) → <Outlet />
 */
export function AdminGuard() {
  const { isAuthenticated, user, loading, mustChangePassword, clearPasswordChangeFlag } = useAuth();

  if (loading) return <AuthLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: "/admin" }} replace />;
  }

  if (!STAFF_ROLES.includes(user?.role as StaffRole)) {
    return <Navigate to="/member" replace />;
  }

  // Force password change on first login
  if (mustChangePassword) {
    return <ForcePasswordChange userName={user?.name ?? ""} onPasswordChanged={clearPasswordChangeFlag} />;
  }

  return <Outlet />;
}

// ── Member Guard ──────────────────────────────────────────────────────────────
/**
 * Schützt alle /member/* Routen.
 * Nicht angemeldet → /login
 * Angemeldet als member oder admin → <Outlet />
 * Andere Staff-Rollen ohne member_id → AccessDenied
 */
export function MemberGuard() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <AuthLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: "/member" }} replace />;
  }

  // Staff (non-admin) ohne member_id dürfen nicht ins Member-Portal
  // Admin darf für Support-Zwecke, Member sowieso
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  if (!isAdmin && !isMember) {
    // Other staff roles can't access member portal unless they have a member_id
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
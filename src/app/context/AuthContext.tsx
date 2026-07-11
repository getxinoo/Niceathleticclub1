/**
 * AuthContext.tsx – NAC Authentication & Authorization Context
 * ─────────────────────────────────────────────────────────────────────────────
 * P0 Sprint: Echtes Permission-System, kein Mock-Login in produktiven Flows.
 *
 * Der Auth-State wird aus dem JWT-Token geladen. Der Token enthält:
 * - sub, name, email, role
 * - permissions: string[] (effective_permissions aus der DB)
 * - must_change_pw: boolean
 * - is_blocked: boolean
 *
 * Mock-Fallback ist NUR für die Entwicklungsumgebung (wenn API nicht erreichbar).
 * In Produktion greift immer die echte PHP-API.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api, ApiError, LoginCredentials, LoginResponse } from '@/lib/api-service';
import {
  type PermissionKey,
  type StaffRole,
  type UserRole,
  STAFF_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  isStaffRole,
} from '@/lib/permissions';

// ── User Type (erweitert um Permissions) ──────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: string[];
  must_change_pw?: boolean;
  is_blocked?: boolean;
  company_email?: string;
  member_id?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  mustChangePassword: boolean;
  isMockSession: boolean;

  // Auth actions
  login: (creds: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearPasswordChangeFlag: () => void;

  // Permission checks
  hasPermission: (key: PermissionKey) => boolean;
  hasAnyPermission: (...keys: PermissionKey[]) => boolean;
  hasAllPermissions: (...keys: PermissionKey[]) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasStaffRole: () => boolean;
  effectivePermissions: PermissionKey[];
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  loading: true,
  mustChangePassword: false,
  isMockSession: false,
  login: async () => {},
  logout: () => {},
  clearPasswordChangeFlag: () => {},
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  hasRole: () => false,
  hasStaffRole: () => false,
  effectivePermissions: [],
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// ── Dev-Only Mock Accounts ────────────────────────────────────────────────────
// Nur aktiv wenn API nicht erreichbar UND wir in dev-Umgebung sind.
// import.meta.env.DEV wird von Vite im Prod-Build durch `false` ersetzt →
// Accounts (inkl. Passwörter) werden per Dead-Code-Elimination aus dem Bundle entfernt.
const DEV_MOCK_ACCOUNTS: { email: string; password: string; user: AuthUser }[] = import.meta.env.DEV
  ? [
      {
        email: 'admin@niceathleticclub.de',
        password: 'NACAdmin2026!',
        user: {
          id: 'dev-admin-1',
          name: 'NAC Admin',
          email: 'admin@niceathleticclub.de',
          role: 'admin',
          is_blocked: false,
          must_change_pw: false,
        },
      },
      {
        email: 'info@xinoo.io',
        password: 'Milow2025!',
        user: {
          id: 'dev-admin-2',
          name: 'Xinoo Dev',
          email: 'info@xinoo.io',
          role: 'admin',
          is_blocked: false,
          must_change_pw: false,
        },
      },
    ]
  : [];

// ── Storage Keys ──────────────────────────────────────────────────────────────
const TOKEN_KEY = 'nac_auth_token';
const USER_KEY = 'nac_user_data';

function getStoredUser(): AuthUser | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const data = localStorage.getItem(USER_KEY);
    if (token && data) return JSON.parse(data);
  } catch {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* noop */ }
  }
  return null;
}

function isDevMockToken(): boolean {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    // Beide Prefixes abfangen: "dev-mock-" (AuthContext) und "mock-jwt-" (Legacy)
    return !!t && (t.startsWith('dev-mock-') || t.startsWith('mock-jwt-'));
  } catch { return false; }
}

// ── Compute Effective Permissions ─────────────────────────────────────────────
function computeEffectivePermissions(user: AuthUser | null): PermissionKey[] {
  if (!user) return [];

  // If permissions are in the token payload (from PHP backend), use those
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions as PermissionKey[];
  }

  // Fallback: derive from role
  const role = user.role;
  if (role === 'admin') {
    // Admin gets everything
    return DEFAULT_ROLE_PERMISSIONS.admin;
  }
  if (isStaffRole(role)) {
    return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  }

  // Member: no staff permissions
  return [];
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(() => getStoredUser() === null);

  useEffect(() => {
    if (!user) {
      const stored = getStoredUser();
      if (stored) setUser(stored);
    }
    setLoading(false);

    // 401 Listener – nur bei echten Sessions
    const handleUnauthorized = () => {
      if (isDevMockToken()) return;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    };
    window.addEventListener('nac:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('nac:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (creds: LoginCredentials) => {
    try {
      const res = await api.auth.login(creds);
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setUser(res.user as AuthUser);
    } catch (err) {
      // Dev-only fallback: nur bei Netzwerkfehler oder Server-Down.
      // In Produktion (import.meta.env.DEV === false) existiert dieser Pfad nicht.
      if (import.meta.env.DEV) {
        const isNetworkError = err instanceof ApiError && err.status === 0;
        const isServerError = err instanceof ApiError && (err.status >= 500 || err.status === 404);

        if (isNetworkError || isServerError) {
          const match = DEV_MOCK_ACCOUNTS.find(
            (a) => a.email.toLowerCase() === creds.email.toLowerCase() && a.password === creds.password,
          );
          if (match) {
            const token = 'dev-mock-' + Date.now();
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(match.user));
            setUser(match.user);
            console.warn(
              '%c[NAC Auth] API nicht erreichbar – Dev-Mock-Login. NICHT für Produktion!',
              'color:#F59E0B;font-weight:bold',
            );
            return;
          }
          // Keine bekannte Dev-E-Mail → hilfreicher Hinweis für die Preview
          throw new Error(
            'Server nicht erreichbar (Vorschau-Modus). ' +
            'Nutze admin@niceathleticclub.de oder info@xinoo.io mit beliebigem Passwort.'
          );
        }
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const clearPasswordChangeFlag = useCallback(() => {
    if (user) {
      const updated = { ...user, must_change_pw: false };
      setUser(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  }, [user]);

  // ── Permission Helpers ──────────────────────────────────────────────────────
  const effectivePermissions = useMemo(
    () => computeEffectivePermissions(user),
    [user],
  );

  const hasPermission = useCallback(
    (key: PermissionKey) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return effectivePermissions.includes(key);
    },
    [user, effectivePermissions],
  );

  const hasAnyPermission = useCallback(
    (...keys: PermissionKey[]) => keys.some((k) => hasPermission(k)),
    [hasPermission],
  );

  const hasAllPermissions = useCallback(
    (...keys: PermissionKey[]) => keys.every((k) => hasPermission(k)),
    [hasPermission],
  );

  const hasRole = useCallback(
    (role: UserRole) => user?.role === role,
    [user],
  );

  const hasStaffRole = useCallback(
    () => !!user && STAFF_ROLES.includes(user.role as StaffRole),
    [user],
  );

  const isMockSession = isDevMockToken();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        mustChangePassword: !!user?.must_change_pw,
        isMockSession,
        login,
        logout,
        clearPasswordChangeFlag,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasStaffRole,
        effectivePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

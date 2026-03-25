/**
 * AppRoot.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level route component for React Router v7 data mode.
 *
 * In createBrowserRouter / RouterProvider, route components run inside
 * the router's own React subtree – they do NOT inherit context from
 * components that wrap <RouterProvider> from outside.
 *
 * Therefore all global providers must live HERE, at the root of the
 * route tree, so every child route has access to them.
 */

import { Outlet } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { AuthProvider } from "../../context/AuthContext";
import { SettingsProvider } from "../../context/SettingsContext";
import { PageVisibilityProvider } from "../../context/PageVisibilityContext";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { useEffect } from "react";
import { initAnalytics } from "../../../lib/analytics";

export function AppRoot() {
  // Initialize consent-based Google Analytics
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <HelmetProvider>
      <AuthProvider>
        <SettingsProvider>
          <PageVisibilityProvider>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </PageVisibilityProvider>

          {/* ── Global Toast Notifications ── */}
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "rgba(14,14,14,0.95)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
              },
              duration: 4000,
            }}
          />
        </SettingsProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
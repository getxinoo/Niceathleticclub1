/**
 * VisibilityGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps a public page component. If the page slug is hidden (via PageVisibility),
 * renders a 404/hidden page instead – unless the user is an admin (staff role),
 * in which case it shows a banner but renders the page anyway.
 */

import { usePageVisibility } from "../context/PageVisibilityContext";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router";

// Map route path → slug for visibility checks
const PATH_TO_SLUG: Record<string, string> = {
  "/studio": "studio",
  "/kurse": "kurse",
  "/preise": "preise",
  "/team": "team",
  "/kontakt": "kontakt",
  "/probetraining": "probetraining",
  "/ueber-uns": "ueber-uns",
  "/personal-training": "personal-training",
  "/crossfit-gp": "crossfit-gp",
  "/firmenfitness": "firmenfitness",
  "/athletic-area": "athletic-area",
  "/hyrox": "hyrox",
  "/nice-theke": "nice-theke",
  "/karriere": "karriere",
  "/presse": "presse",
  "/impressum": "impressum",
  "/datenschutz": "datenschutz",
  "/agb": "agb",
};

interface VisibilityGateProps {
  path: string;
  children: React.ReactNode;
}

export function VisibilityGate({ path, children }: VisibilityGateProps) {
  const { isVisible, visibility, loaded } = usePageVisibility();
  const { user } = useAuth();
  const slug = PATH_TO_SLUG[path];

  // No slug mapping = always visible (e.g. home)
  if (!slug) return <>{children}</>;

  // Solange die Sichtbarkeits-Daten noch nicht geladen sind UND wir für diesen
  // Slug noch keinen (auch nur gecachten) Stand kennen, NICHTS rendern – sonst
  // würde ein Draft kurz als "sichtbar" aufblitzen (Default ist sonst true).
  const hasKnownState = slug in visibility;
  if (!loaded && !hasKnownState) {
    return null;
  }

  const visible = isVisible(slug);
  const isAdmin = user?.role === "admin" || user?.role === "owner" || user?.role === "manager";

  if (visible) return <>{children}</>;

  // Admin sees the page with a warning banner
  if (isAdmin) {
    return (
      <>
        {/* Admin-only banner */}
        <div
          style={{
            position: "fixed",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "rgba(239,68,68,0.95)",
            backdropFilter: "blur(12px)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: 600,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "white",
            }}
          >
            Diese Seite ist ausgeblendet
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
            Nur Admins sehen diese Vorschau.
          </span>
          <Link
            to={`/admin/seiten/edit/${slug}`}
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "white",
              background: "rgba(0,0,0,0.3)",
              padding: "5px 12px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Im Editor öffnen
          </Link>
        </div>
        {children}
      </>
    );
  }

  // Public user: show hidden/404 page
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 6vw, 4rem)",
            color: "rgba(255,255,255,0.08)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            margin: "0 0 16px",
          }}
        >
          404
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
            color: "white",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            fontWeight: 400,
            margin: "0 0 12px",
          }}
        >
          Seite nicht verfügbar
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.7,
            margin: "0 0 32px",
          }}
        >
          Diese Seite ist derzeit nicht erreichbar. Bitte besuche unsere Startseite
          oder kontaktiere uns direkt.
        </p>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "14px 32px",
            background: "var(--brand)",
            color: "white",
            fontFamily: "var(--font-condensed)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { RouterProvider } from "react-router";
import { syncPageBlocksOnce } from "../lib/page-sync";

/**
 * Nice Athletic Club – App Entry
 *
 * Uses dynamic import() for the router to prevent module-evaluation errors
 * in any route component from causing a blank white screen. If routes.ts or
 * any of its imports throw during evaluation, this component catches the error
 * and displays a visible error message instead of nothing.
 *
 * All global providers (AuthProvider, HelmetProvider, Toaster) live inside the
 * router tree via AppRoot (components/layout/AppRoot.tsx), which is correct for
 * React Router v7 data mode where context must be inside the RouterProvider tree.
 *
 * PAGE SYNC: syncPageBlocksOnce() läuft synchron vor dem Router-Load und
 * schreibt alle PAGE_INITIAL_BLOCKS in localStorage (einmalig, versioniert).
 * Das stellt sicher, dass Admin-PageEditor und Frontend-Seiten immer die
 * aktuellen Block-Daten verwenden.
 */

// ── Globaler einmaliger Page-Seed (synchron, vor Router-Load) ─────────────────
syncPageBlocksOnce();

type Status = "loading" | "ready" | "error";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [router, setRouter] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    import("./routes")
      .then(({ router: r }) => {
        if (!r) {
          setErrorMsg("Router konnte nicht initialisiert werden.");
          setStatus("error");
          return;
        }
        setRouter(r);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[NAC] App failed to load routes:", msg, err);
        setErrorMsg(msg);
        setStatus("error");
      });
  }, []);

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            background: "#CA0C85",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "20px",
              letterSpacing: "0.02em",
            }}
          >
            N
          </span>
        </div>
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase",
          }}
        >
          Nice Athletic Club
        </p>
      </div>
    );
  }

  /* ── Error fallback ───────────────────────────────────────────────────── */
  if (status === "error" || !router) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              color: "white",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "1.6rem",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            App konnte nicht laden
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontFamily: "sans-serif",
              fontSize: "13px",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            Ein Fehler ist beim Initialisieren der Anwendung aufgetreten.
          </p>
          {errorMsg && (
            <pre
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.12)",
                color: "rgba(248,113,113,0.8)",
                fontFamily: "monospace",
                fontSize: "11px",
                padding: "12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textAlign: "left",
                marginBottom: "20px",
              }}
            >
              {errorMsg}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#CA0C85",
              color: "white",
              border: "none",
              padding: "12px 24px",
              fontFamily: "sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  /* ── Normal render ────────────────────────────────────────────────────── */
  return <RouterProvider router={router} />;
}
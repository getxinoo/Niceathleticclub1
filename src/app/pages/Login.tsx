/**
 * Login.tsx – NAC Authentication Screen
 * ─────────────────────────────────────────────────────────────────────────────
 * High-end Dark Mode Login mit Glassmorphism-Karte und Magenta-Glow-Effekten.
 * Nach erfolgreichem Login: Redirect basierend auf user.role.
 *   admin  → /admin
 *   member → /member
 */

import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../lib/api-service";
import { STAFF_ROLES } from "../../lib/permissions";

// ── Reduced Motion Hook ───────────────────────────────────────────────────────
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export default function Login() {
  const navigate         = useNavigate();
  const location         = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const reducedMotion    = usePrefersReducedMotion();

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Redirect wenn bereits eingeloggt
useEffect(() => {
  if (isAuthenticated && user) {
    const isStaff = STAFF_ROLES.includes(user.role as any);
    const destination = isStaff ? "/admin" : "/member";
    navigate(destination, { replace: true });
  }
}, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await login({ email, password });
      // Nach login() ist user gesetzt → useEffect oben übernimmt den Redirect
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ein unbekannter Fehler ist aufgetreten.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Redirect-Target aus Location-State ─────────────────────────────────────
  const from = (location.state as { from?: string })?.from ?? null;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* ── Background Image (subtle) ── */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1770513649465-2c60c8039806?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.06,
        }}
      />

      {/* ── Ambient Magenta Orb ── */}
      <motion.div
        className="absolute z-0"
        style={{
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(202,12,133,0.18) 0%, rgba(202,12,133,0.05) 50%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
        animate={
          reducedMotion
            ? {}
            : {
                scale: [1, 1.08, 1],
                opacity: [0.8, 1, 0.8],
              }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Top Scanline decoration ── */}
      <div
        className="absolute inset-x-0 top-0 z-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(202,12,133,0.5) 50%, transparent)",
        }}
      />

      {/* ── Login Card ── */}
      <motion.div
        className="relative z-10 w-full"
        style={{ maxWidth: "440px", margin: "0 auto", padding: "24px" }}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── Card ── */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 0 0 1px rgba(202,12,133,0.06), 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
            padding: "48px 40px",
          }}
        >
          {/* ── Logo ── */}
          <div
            className="flex items-center gap-3 mb-10"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "28px" }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 20px rgba(202,12,133,0.5)",
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
            <div>
              <p
                className="text-white"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "15px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  lineHeight: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Nice Athletic Club
              </p>
              <p
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                }}
              >
                Members & Admin Portal
              </p>
            </div>
          </div>

          {/* ── Headline ── */}
          <h1
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 6vw, 2.8rem)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Willkommen zurück
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "36px",
            }}
          >
            {from
              ? `Bitte anmelden um fortzufahren.`
              : "Melde dich mit deinen Zugangsdaten an."}
          </p>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="admin@niceathleticclub.de"
                required
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  padding: "14px 16px",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)";
                  e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(202,12,133,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.boxShadow   = "none";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Passwort
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    padding: "14px 48px 14px 16px",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(202,12,133,0.6)";
                    e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(202,12,133,0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow   = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.3)",
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
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "12px 14px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    <AlertCircle
                      size={15}
                      style={{ color: "#f87171", flexShrink: 0, marginTop: "1px" }}
                    />
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "13px",
                        color: "#fca5a5",
                        lineHeight: 1.4,
                      }}
                    >
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading || !email || !password}
              whileHover={reducedMotion ? {} : { y: -1 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              className="flex items-center justify-center gap-2 text-white cursor-pointer"
              style={{
                width: "100%",
                background: isLoading ? "rgba(202,12,133,0.6)" : "var(--brand)",
                border: "none",
                fontFamily: "var(--font-condensed)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "16px 24px",
                minHeight: "52px",
                marginTop: "8px",
                boxShadow: isLoading
                  ? "none"
                  : "0 0 24px rgba(202,12,133,0.35), 0 4px 12px rgba(202,12,133,0.2)",
                transition: "background 0.2s, box-shadow 0.2s, opacity 0.2s",
                opacity: (!email || !password) && !isLoading ? 0.5 : 1,
                cursor: isLoading || !email || !password ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Anmelden…
                </>
              ) : (
                <>
                  Anmelden
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </form>

          {/* ── Footer ── */}
          <div
            className="flex items-center justify-between"
            style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Link
              to="/"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.25)",
                textDecoration: "none",
                textTransform: "uppercase",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
            >
              ← Zur Website
            </Link>
            <p
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.12)",
                textTransform: "uppercase",
              }}
            >
              Geschützte Zone
            </p>
          </div>
        </div>

        {/* ── Security Notice ── */}
        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontFamily: "var(--font-body)",
            fontSize: "11px",
            color: "rgba(255,255,255,0.15)",
            lineHeight: 1.5,
          }}
        >
          Nur für autorisierte Mitglieder und Admins.
          <br />
          Verbindung ist verschlüsselt.
        </p>
      </motion.div>
    </div>
  );
}
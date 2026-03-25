import { useState } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { api } from "../../lib/api-service";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Zap,
  HeartHandshake,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";

// ── Assets ────────────────────────────────────────────────────────────────────
const HERO_IMG =
  "https://images.unsplash.com/photo-1618169480981-ddb08182cfa8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1400";

// ── Trust Badges ──────────────────────────────────────────────────────────────
const TRUST_BADGES = [
  { icon: ShieldCheck,   text: "100 % kostenlos & unverbindlich" },
  { icon: CalendarDays,  text: "Termin innerhalb von 48 Stunden" },
  { icon: Zap,           text: "Persönlicher Coach an deiner Seite" },
  { icon: HeartHandshake,text: "Keine versteckten Kosten" },
];

// ── Form Types ─────────────────────────────────────────────────────────────────
type Goal = "" | "abnehmen" | "muskelaufbau" | "fitness" | "crossfit";

interface FormData {
  name: string;
  email: string;
  phone: string;
  goal: Goal;
  date: string;
}

const GOALS: { value: Goal; label: string }[] = [
  { value: "",           label: "Wähle dein Ziel …" },
  { value: "abnehmen",   label: "Abnehmen & Körperfett reduzieren" },
  { value: "muskelaufbau", label: "Muskelaufbau & Kraft" },
  { value: "fitness",    label: "Allgemeine Fitness & Gesundheit" },
  { value: "crossfit",   label: "CrossFit & Functional Training" },
];

// ── Shared field style ────────────────────────────────────────────────────────
const fieldBase: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "white",
  padding: "14px 16px",
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  fontWeight: 400,
  letterSpacing: "0",
  outline: "none",
  transition: "border-color 0.2s",
};

// ── What to expect list ───────────────────────────────────────────────────────
const WHAT_TO_EXPECT = [
  "Persönliches Beratungsgespräch (30 min)",
  "Geführte Tour durch alle Trainingsbereiche",
  "1 kostenlose Trainingseinheit mit einem Coach",
  "Individueller Trainingsplan-Vorschlag",
  "Keine Vertragsbindung, kein Druck",
];

// ── Form Component ────────────────────────────────────────────────────────────
function TrialForm() {
  const [form, setForm] = useState<FormData>({
    name: "", email: "", phone: "", goal: "", date: "",
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.public.submitLead({
        type: "trial" as const,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        goal: (form.goal || "fitness") as any,
        desiredDate: form.date,
        status: "Neu" as const,
        notes: null,
      });
    } catch {
      // Auch bei Fehler: Erfolgsmeldung zeigen (UX)
    }
    setLoading(false);
    setSubmitted(true);
  };

  const fs = (name: string): React.CSSProperties => ({
    ...fieldBase,
    borderColor: focused === name ? "var(--brand)" : "rgba(255,255,255,0.09)",
    colorScheme: "dark",
  });

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center py-16 text-center gap-5"
      >
        <div
          className="w-20 h-20 flex items-center justify-center"
          style={{
            background: "rgba(202,12,133,0.1)",
            border: "2px solid rgba(202,12,133,0.3)",
          }}
        >
          <CheckCircle2 size={36} style={{ color: "var(--brand)" }} />
        </div>
        <div>
          <h3
            className="text-white mb-2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              letterSpacing: "0.02em",
            }}
          >
            ANFRAGE GESENDET
          </h3>
          <p className="text-white/50 leading-relaxed text-sm max-w-xs">
            Wir melden uns innerhalb von 24 Stunden persönlich bei dir.
            Schon bald siehst du den Unterschied.
          </p>
        </div>
        <p
          className="text-white/25 text-xs"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "11px",
            letterSpacing: "0.15em",
          }}
        >
          NICE ATHLETIC CLUB · GÖPPINGEN
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pt-name"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
          }}
        >
          Name *
        </label>
        <input
          id="pt-name"
          name="name"
          type="text"
          required
          placeholder="Max Mustermann"
          value={form.name}
          onChange={handleChange}
          onFocus={() => setFocused("name")}
          onBlur={() => setFocused(null)}
          style={fs("name")}
          className="placeholder:text-white/20"
        />
      </div>

      {/* Email + Phone (side by side on sm+) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pt-email"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
            }}
          >
            E-Mail *
          </label>
          <input
            id="pt-email"
            name="email"
            type="email"
            required
            placeholder="max@example.de"
            value={form.email}
            onChange={handleChange}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            style={fs("email")}
            className="placeholder:text-white/20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pt-phone"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
            }}
          >
            Telefon (optional)
          </label>
          <input
            id="pt-phone"
            name="phone"
            type="tel"
            placeholder="+49 40 …"
            value={form.phone}
            onChange={handleChange}
            onFocus={() => setFocused("phone")}
            onBlur={() => setFocused(null)}
            style={fs("phone")}
            className="placeholder:text-white/20"
          />
        </div>
      </div>

      {/* Goal */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pt-goal"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
          }}
        >
          Dein Ziel *
        </label>
        <select
          id="pt-goal"
          name="goal"
          required
          value={form.goal}
          onChange={handleChange}
          onFocus={() => setFocused("goal")}
          onBlur={() => setFocused(null)}
          style={{ ...fs("goal"), cursor: "pointer" }}
          className="appearance-none"
        >
          {GOALS.map((g) => (
            <option key={g.value} value={g.value} style={{ background: "#1a1a1a" }}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pt-date"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
          }}
        >
          Wunschtermin *
        </label>
        <input
          id="pt-date"
          name="date"
          type="date"
          required
          min={new Date().toISOString().split("T")[0]}
          value={form.date}
          onChange={handleChange}
          onFocus={() => setFocused("date")}
          onBlur={() => setFocused(null)}
          style={fs("date")}
        />
      </div>

      {/* Privacy */}
      <p className="text-white/25 text-xs leading-relaxed">
        Durch das Absenden stimmst du unserer{" "}
        <a href="#" className="underline hover:text-brand transition-colors">
          Datenschutzerklärung
        </a>{" "}
        zu. Keine Weitergabe an Dritte.
      </p>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="group w-full flex items-center justify-center gap-3 text-white transition-all duration-300 cursor-pointer active:scale-[0.99]"
        style={{
          background: loading ? "rgba(202,12,133,0.5)" : "var(--brand)",
          fontFamily: "var(--font-condensed)",
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          border: "none",
          minHeight: "56px",
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = "var(--brand-light)";
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.background = "var(--brand)";
        }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full inline-block"
            />
            Wird gesendet …
          </span>
        ) : (
          <>
            Kostenlos anfragen
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform duration-300"
            />
          </>
        )}
      </button>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Probetraining() {
  const reduced = useReducedMotion();

  return (
    <>
      <PageMeta
        title="Kostenloses Probetraining"
        description="Starte jetzt mit deinem kostenlosen Probetraining im Nice Athletic Club Hamburg. Kein Vertrag, kein Risiko – nur dein erster Schritt."
        canonical="https://niceathleticclub.de/probetraining"
      />

      <div
        className="min-h-screen flex flex-col lg:flex-row"
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        {/* ────────────────────────────────────────────────────
            MOBILE HERO (< sm) — full-screen immersive
        ──────────────────────────────────────────────────── */}
        <section
          className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
          style={{ backgroundColor: "#050505" }}
        >
          {/* BG image */}
          <img
            src={HERO_IMG}
            alt="Probetraining"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.3) saturate(1.1)" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #050505 0%, rgba(5,5,5,0.4) 50%, rgba(5,5,5,0.6) 100%)" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }} />

          <div className="relative w-full px-5 pb-8 pt-28" style={{ zIndex: 5 }}>
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav className="flex items-center gap-1.5 mb-4 text-white/40"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}>
                <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
                <ChevronRight size={11} />
                <span className="text-white/60">PROBETRAINING</span>
              </nav>

              <div className="inline-flex items-center gap-2 mb-5"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--brand)" }}>
                <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
                Kostenlos & Unverbindlich
                <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
              </div>

              <h1 className="text-white mb-4" style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(3rem, 14vw, 4.5rem)",
                lineHeight: 0.9, letterSpacing: "0.02em", textTransform: "uppercase",
              }}>
                DEIN ERSTER{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>SCHRITT.</span>
              </h1>

              <p className="text-white/40 leading-relaxed mb-6 max-w-xs" style={{ fontSize: "0.85rem" }}>
                Komm vorbei, erlebe das Studio und trainiere einmal komplett kostenlos – ohne jeden Druck.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  { val: "0€", lbl: "Kostenlos" },
                  { val: "48h", lbl: "Termin in" },
                  { val: "1:1", lbl: "Mit Coach" },
                  { val: "0", lbl: "Risiko" },
                ].map((s) => (
                  <div key={s.lbl} className="text-center py-3"
                    style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1 }}>{s.val}</span>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{s.lbl}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  const el = document.getElementById("probetraining-form-mobile");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300 cursor-pointer"
                style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px", border: "none" }}>
                JETZT ANFRAGEN <ArrowRight size={16} />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex justify-center mt-6">
              <motion.div animate={reduced ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                <ChevronDown size={18} className="text-white/20" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────
            LEFT PANEL — Emotional image + trust signals (DESKTOP sm+)
        ──────────────────────────────────────────────────── */}
        <div className="relative lg:w-[52%] lg:sticky lg:top-0 lg:h-screen overflow-hidden hidden sm:block">
          {/* Background Image */}
          <img
            src={HERO_IMG}
            alt="Probetraining im Nice Athletic Club"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.45) saturate(1.05)" }}
          />

          {/* Gradient overlays */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, transparent 40%, var(--surface-0) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--surface-0) 0%, transparent 50%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at bottom left, rgba(202,12,133,0.2), transparent 60%)",
            }}
          />

          {/* Content overlay */}
          <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-12 lg:p-14 min-h-[380px] lg:min-h-0">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className="inline-flex items-center gap-2 text-brand mb-5"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                }}
              >
                <span className="w-5 h-px" style={{ background: "var(--brand)" }} />
                KOSTENLOS & UNVERBINDLICH
              </span>

              <h1
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3rem, 7vw, 5rem)",
                  lineHeight: 0.95,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                DEIN ERSTER
                <br />
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>SCHRITT.</span>
                <br />
                UNSER GESCHENK.
              </h1>

              <p
                className="text-white/55 leading-relaxed mb-8 max-w-sm"
                style={{ fontSize: "15px" }}
              >
                Komm vorbei, erlebe das Studio und trainiere einmal komplett kostenlos —
                ohne jeden Druck.
              </p>

              {/* Trust badges */}
              <ul className="space-y-3">
                {TRUST_BADGES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(202,12,133,0.12)",
                        border: "1px solid rgba(202,12,133,0.2)",
                      }}
                    >
                      <Icon size={13} style={{ color: "var(--brand)" }} />
                    </div>
                    <span
                      className="text-white/65"
                      style={{ fontSize: "13px" }}
                    >
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────
            RIGHT PANEL — Form
        ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-6 py-16 lg:py-32" id="probetraining-form-mobile">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[480px]"
          >
            {/* Glassmorphism card */}
            <div
              className="p-8 md:p-10"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow:
                  "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Card header */}
              <div className="mb-8">
                <h2
                  className="text-white mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2rem",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  TERMIN ANFRAGEN
                </h2>
                <p
                  className="text-white/40"
                  style={{ fontSize: "13px", lineHeight: 1.6 }}
                >
                  Füll das Formular aus — wir melden uns persönlich in unter 24&nbsp;h.
                </p>
              </div>

              <TrialForm />
            </div>

            {/* What to expect – below the card */}
            <div className="mt-8 px-2">
              <p
                className="text-white/30 mb-4"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                }}
              >
                WAS DICH ERWARTET
              </p>
              <ul className="space-y-2.5">
                {WHAT_TO_EXPECT.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={13}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--brand)" }}
                    />
                    <span
                      className="text-white/50"
                      style={{ fontSize: "13px", lineHeight: 1.5 }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
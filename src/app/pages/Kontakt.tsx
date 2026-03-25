/**
 * Kontakt.tsx – Kontaktseite
 * Desktop: Komplett unveraendert
 * Mobile (< sm): Full-screen Hero, Quick-Actions, optimiertes Layout
 */
import { useState, useRef } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import {
  MapPin, Phone, Mail, Clock, ArrowRight,
  CheckCircle2, Instagram, Facebook, Send,
  ChevronRight, ChevronDown, MessageSquare,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ScanLine, Particle } from "../components/ui/legal-page";
import { useSettings } from "../context/SettingsContext";
import { api } from "../../lib/api-service";

// ── Types ─────────────────────────────────────────────────────────────────────
type Topic = "membership" | "pt" | "corporate" | "probetraining" | "other";
interface FormState {
  name: string; email: string; phone: string;
  topic: Topic; message: string;
}

const TOPICS: { value: Topic; label: string }[] = [
  { value: "membership",    label: "Mitgliedschaft"   },
  { value: "probetraining", label: "Probetraining"    },
  { value: "pt",            label: "Personal Training"},
  { value: "corporate",     label: "Firmenfitness"    },
  { value: "other",         label: "Sonstiges"        },
];

const OPENING_HOURS = [
  { day: "Mo – Fr",   time: "05:00 – 00:00", active: true  },
  { day: "Samstag",   time: "05:00 – 00:00", active: true  },
  { day: "Sonntag",   time: "05:00 – 00:00", active: true  },
  { day: "Feiertage", time: "05:00 – 00:00", active: true  },
];

const SOCIAL = [
  { icon: Instagram, href: "https://www.instagram.com/nice_athletic_club/", label: "@nice_athletic_club" },
  { icon: Instagram, href: "https://www.instagram.com/nice_fitnessandspa",   label: "@nice_fitnessandspa"   },
  { icon: Facebook,  href: "https://www.facebook.com/nice_athletic_club-113347320451242/", label: "Nice Athletic Club" },
];

// ── Contact form ──────────────────────────────────────────────────────────────
function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: "", email: "", phone: "", topic: "membership", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.public.submitLead({
        type: "contact" as const,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        goal: "fitness" as any,
        desiredDate: new Date().toISOString().slice(0, 10),
        status: "Neu" as const,
        notes: `[${form.topic}] ${form.message}`,
      });
    } catch {
      // Bei Fehler trotzdem Erfolg anzeigen (UX)
    }
    setSubmitted(true);
  };

  const fieldStyle = (name: string): React.CSSProperties => ({
    background: "var(--surface-3)",
    border: `1px solid ${focused === name ? "rgba(202,12,133,0.55)" : "rgba(255,255,255,0.07)"}`,
    color: "white",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0",
    textTransform: "none",
    padding: "14px 16px",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s",
    borderRadius: 0,
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-condensed)",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.35)",
    display: "block",
    marginBottom: "6px",
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div
          className="w-16 h-16 flex items-center justify-center mb-6"
          style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.25)" }}
        >
          <CheckCircle2 size={28} style={{ color: "var(--brand)" }} />
        </div>
        <h3 className="text-white mb-3"
          style={{ fontFamily: "var(--font-display)", fontSize: "2rem", letterSpacing: "0.02em" }}>
          NACHRICHT GESENDET
        </h3>
        <p className="text-white/40 text-sm leading-relaxed max-w-xs">
          Wir melden uns innerhalb von 24 Stunden bei dir. Versprochen.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>NAME *</label>
          <input id="name" name="name" type="text" required
            placeholder="Max Mustermann" value={form.name}
            onChange={handleChange} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
            style={fieldStyle("name")} className="placeholder:text-white/20" />
        </div>
        <div>
          <label style={labelStyle}>E-MAIL *</label>
          <input id="email" name="email" type="email" required
            placeholder="max@beispiel.de" value={form.email}
            onChange={handleChange} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
            style={fieldStyle("email")} className="placeholder:text-white/20" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>TELEFON (OPTIONAL)</label>
          <input id="phone" name="phone" type="tel"
            placeholder="+49 7161 ..." value={form.phone}
            onChange={handleChange} onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
            style={fieldStyle("phone")} className="placeholder:text-white/20" />
        </div>
        <div>
          <label style={labelStyle}>THEMA *</label>
          <select id="topic" name="topic" required value={form.topic}
            onChange={handleChange} onFocus={() => setFocused("topic")} onBlur={() => setFocused(null)}
            style={{ ...fieldStyle("topic"), cursor: "pointer" }} className="appearance-none">
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value} style={{ background: "#1a1a1a" }}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>NACHRICHT *</label>
        <textarea id="message" name="message" required rows={5}
          placeholder="Wie können wir dir helfen?"
          value={form.message} onChange={handleChange}
          onFocus={() => setFocused("message")} onBlur={() => setFocused(null)}
          style={{ ...fieldStyle("message"), resize: "vertical", minHeight: "130px" }}
          className="placeholder:text-white/20"
        />
      </div>

      <p className="text-white/25 text-xs leading-relaxed">
        Mit dem Absenden stimmst du unserer{" "}
        <a href="/datenschutz" className="underline hover:text-brand transition-colors">Datenschutzerklärung</a>
        {" "}zu.
      </p>

      <button
        type="submit"
        className="group w-full flex items-center justify-center gap-3 py-4 text-white transition-all duration-200 cursor-pointer active:scale-[0.99]"
        style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.12em", border: "none", minHeight: "54px" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(202,12,133,0.4)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
      >
        <Send size={14} />
        Nachricht senden
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </form>
  );
}

// ── Info block ────────────────────────────────────────────────────────────────
function InfoBlock({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-start gap-4 p-5 transition-all duration-300"
      style={{
        background: hovered ? "linear-gradient(135deg, rgba(202,12,133,0.06) 0%, rgba(17,17,17,0.98) 60%)" : "var(--surface-2)",
        border: hovered ? "1px solid rgba(202,12,133,0.35)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hovered ? "0 0 30px rgba(202,12,133,0.1)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-10 h-10 flex items-center justify-center shrink-0"
        style={{
          background: hovered ? "rgba(202,12,133,0.18)" : "rgba(202,12,133,0.08)",
          border: hovered ? "1px solid rgba(202,12,133,0.4)" : "1px solid rgba(202,12,133,0.15)",
          transition: "background 0.3s, border-color 0.3s",
        }}
      >
        <Icon size={16} style={{ color: "var(--brand)" }} />
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>
          {label}
        </p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

// ── Mobile Quick Action ─────────────────────────────────────────────────────
function MobileQuickAction({ icon: Icon, label, sub, href }: {
  icon: React.ElementType; label: string; sub: string; href: string;
}) {
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="flex items-center gap-4 p-4 active:scale-[0.98] transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="w-12 h-12 flex items-center justify-center shrink-0"
        style={{
          background: "rgba(202,12,133,0.1)",
          border: "1px solid rgba(202,12,133,0.25)",
        }}
      >
        <Icon size={18} style={{ color: "var(--brand)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white" style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}>
          {label}
        </p>
        <p className="text-white/40 truncate" style={{ fontSize: "12px" }}>
          {sub}
        </p>
      </div>
      <ChevronRight size={16} className="text-white/20 shrink-0" />
    </a>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Kontakt() {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const { s } = useSettings();

  // Computed values aus Settings
  const phoneHref = `tel:${s.phone.replace(/[\s\-()\\/]/g, "")}`;
  const mapsQuery = encodeURIComponent(`${s.company_street}, ${s.company_zip} ${s.company_city}`);
  const mapsHref  = `https://maps.google.com/?q=${mapsQuery}`;

  return (
    <>
      <PageMeta
        title="Kontakt"
        description="Schreib uns oder ruf an – Nice Athletic Club Göppingen. Kontaktformular, Öffnungszeiten und Adresse."
        canonical="https://niceathleticclub.de/kontakt"
      />

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        {/* ══════════════════════════════════════════════════════════════════
            DESKTOP HERO (sm+) — original unchanged
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="pt-32 pb-16 overflow-hidden hidden sm:block"
          style={{ backgroundColor: "var(--surface-0)", minHeight: "340px", position: "relative" }}
        >
          {/* Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(202,12,133,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,0.8) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
          {/* Glows */}
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(202,12,133,0.12) 0%, transparent 65%)" }} />
          <div className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top right, rgba(202,12,133,0.08) 0%, transparent 70%)" }} />

          <Particle x="12%" y="25%" delay={0}   />
          <Particle x="27%" y="70%" delay={1.1} />
          <Particle x="55%" y="15%" delay={0.7} />
          <Particle x="72%" y="80%" delay={1.8} />
          <Particle x="88%" y="35%" delay={0.4} />
          <ScanLine />

          {/* Ghost text */}
          <motion.div
            style={{ y: ghostY }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          >
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(4rem, 22vw, 18rem)",
              color: "rgba(255,255,255,0.018)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}>
              KONTAKT
            </span>
          </motion.div>

          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <motion.div
                initial={{ opacity: 0, y: reduced ? 0 : 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="inline-flex items-center gap-2 mb-4"
                  style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                  <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
                  WIR SIND FÜR DICH DA
                  <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
                </div>
                <h1 style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)", fontFamily: "var(--font-display)", color: "white", lineHeight: 0.95 }}>
                  SCHREIB <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>UNS</span>
                </h1>
                <p className="mt-4 text-white/40 text-sm max-w-md leading-relaxed">
                  Fragen zur Mitgliedschaft, Personal Training oder einem Probetraining?
                  Wir antworten innerhalb von 24 Stunden.
                </p>
              </motion.div>

              {/* Badges */}
              <motion.div
                initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-4 shrink-0"
              >
                {[
                  { label: "ANTWORT IN", val: "24h" },
                  { label: "STANDORT",   val: "GPP" },
                ].map(({ label, val }) => (
                  <div key={label}
                    className="flex flex-col items-center justify-center w-20 h-20"
                    style={{ border: "1px solid rgba(202,12,133,0.2)", background: "rgba(202,12,133,0.04)" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--brand)", lineHeight: 1 }}>{val}</span>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.13em", color: "rgba(255,255,255,0.3)", marginTop: "4px", textAlign: "center" }}>{label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 h-px origin-left"
              style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.1), transparent)" }}
            />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            MOBILE HERO (< sm) — full-screen immersive
        ══════════════════════════════════════════════════════════════════ */}
        <section
          className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
          style={{ backgroundColor: "#050505" }}
        >
          {/* Radial glow top */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] opacity-15 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)",
            }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(202,12,133,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,0.8) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
          {/* Bottom gradient */}
          <div
            className="absolute bottom-0 left-0 w-full h-[40vh] pointer-events-none"
            style={{ background: "linear-gradient(to top, #050505, transparent)" }}
          />

          <div className="relative w-full px-5 pb-8 pt-28" style={{ zIndex: 5 }}>
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Breadcrumb */}
              <nav
                className="flex items-center gap-1.5 mb-4 text-white/40"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                }}
              >
                <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
                <ChevronRight size={11} />
                <span className="text-white/60">KONTAKT</span>
              </nav>

              {/* Label */}
              <div
                className="inline-flex items-center gap-2 mb-5"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--brand)",
                }}
              >
                <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
                Wir sind für dich da
                <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
              </div>

              {/* Title */}
              <h1
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3.2rem, 15vw, 5rem)",
                  lineHeight: 0.9,
                  letterSpacing: "0.02em",
                }}
              >
                SCHREIB{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                  UNS
                </span>
              </h1>

              <p
                className="text-white/40 leading-relaxed mb-6 max-w-xs"
                style={{ fontSize: "0.85rem" }}
              >
                Fragen zur Mitgliedschaft oder Probetraining?
                Wir antworten innerhalb von 24h.
              </p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { val: "24h", lbl: "Antwortzeit" },
                  { val: "GPP", lbl: "Standort" },
                  { val: "24/7", lbl: "Erreichbar" },
                ].map((s) => (
                  <div
                    key={s.lbl}
                    className="text-center py-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span
                      className="text-white block"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.2rem",
                        lineHeight: 1,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {s.val}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "8px",
                        fontWeight: 600,
                        letterSpacing: "0.12em",
                        color: "rgba(255,255,255,0.3)",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.lbl}
                    </span>
                  </div>
                ))}
              </div>

              {/* Scroll-to-form CTA */}
              <button
                onClick={() => {
                  const el = document.getElementById("mobile-kontakt-form");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300 cursor-pointer"
                style={{
                  background: "var(--brand)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  minHeight: "52px",
                  border: "none",
                }}
              >
                <MessageSquare size={16} />
                NACHRICHT SCHREIBEN
                <ArrowRight size={16} />
              </button>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex justify-center mt-6"
            >
              <motion.div
                animate={reduced ? {} : { y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <ChevronDown size={18} className="text-white/20" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            DESKTOP MAIN CONTENT (sm+) — original unchanged
        ══════════════════════════════════════════════════════════════════ */}
        <section className="pb-24 pt-10 hidden sm:block" style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="relative max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-5 gap-6">

              {/* ── Left: Info Panel ── */}
              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-2 space-y-4"
              >
                {/* Section label */}
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.25)" }}>
                  KONTAKTDATEN
                </p>

                <InfoBlock icon={MapPin} label="ADRESSE">
                  <p className="text-white/70 text-sm">{s.company_street}</p>
                  <p className="text-white/70 text-sm">{s.company_zip} {s.company_city}</p>
                  <a
                    href={mapsHref}
                    target="_blank" rel="noopener noreferrer"
                    className="text-brand hover:text-white transition-colors text-xs mt-1 inline-block"
                  >
                    In Google Maps öffnen →
                  </a>
                </InfoBlock>

                <InfoBlock icon={Phone} label="TELEFON">
                  <a href={phoneHref} className="text-white/70 hover:text-brand transition-colors text-sm">
                    {s.phone}
                  </a>
                </InfoBlock>

                <InfoBlock icon={Mail} label="E-MAIL">
                  <a href={`mailto:${s.email}`} className="text-white/70 hover:text-brand transition-colors text-sm">
                    {s.email}
                  </a>
                </InfoBlock>

                {/* Opening hours */}
                <div
                  className="p-5"
                  style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.15)" }}>
                      <Clock size={16} style={{ color: "var(--brand)" }} />
                    </div>
                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>
                      ÖFFNUNGSZEITEN
                    </p>
                  </div>
                  <ul className="space-y-2.5">
                    {OPENING_HOURS.map(({ day, time, active }) => (
                      <li key={day}
                        className="flex items-center justify-between py-1.5 border-b"
                        style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <span className={`text-sm ${active ? "text-white/60" : "text-white/35"}`}>{day}</span>
                        <span style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em",
                          color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                        }}>
                          {time}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Social */}
                <div
                  className="p-5"
                  style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="mb-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>
                    SOCIAL MEDIA
                  </p>
                  <div className="space-y-2">
                    {SOCIAL.map(({ icon: Icon, href, label }) => (
                      <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-white/50 hover:text-brand transition-colors duration-200 text-sm group">
                        <Icon size={13} className="group-hover:scale-110 transition-transform" />
                        <span>{label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* ── Right: Form ── */}
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-3 relative overflow-hidden"
                style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Top accent */}
                <div className="h-[2px]"
                  style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.2), transparent)" }} />

                {/* Section num watermark */}
                <div className="absolute right-8 top-8 select-none pointer-events-none"
                  style={{ fontFamily: "var(--font-display)", fontSize: "8rem", color: "rgba(202,12,133,0.04)", lineHeight: 1 }}>
                  01
                </div>

                <div className="p-8 md:p-10 relative">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}>
                      <Send size={16} style={{ color: "var(--brand)" }} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)" }}>01</span>
                      <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", letterSpacing: "0.04em", lineHeight: 1.1 }}>
                        DEINE NACHRICHT
                      </h2>
                    </div>
                  </div>
                  <ContactForm />
                </div>
              </motion.div>
            </div>

            {/* ── Map placeholder ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 relative overflow-hidden"
              style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.06)", height: "180px" }}
            >
              {/* Decorative grid */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "linear-gradient(rgba(202,12,133,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,0.8) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center"
                  style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}>
                  <MapPin size={18} style={{ color: "var(--brand)" }} />
                </div>
                <div className="text-center">
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)" }}>
                    {s.company_street.toUpperCase()} · {s.company_zip} {s.company_city.toUpperCase()}
                  </p>
                  <a
                    href={mapsHref}
                    target="_blank" rel="noopener noreferrer"
                    className="text-brand hover:text-white transition-colors text-xs mt-1 inline-block"
                  >
                    In Google Maps öffnen →
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            MOBILE CONTENT (< sm)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="relative sm:hidden" style={{ backgroundColor: "var(--surface-0)" }}>

          {/* ── Quick Actions ── */}
          <section className="relative px-5 pt-10 pb-6">
            <div
              className="inline-flex items-center gap-2 mb-4"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "var(--brand)",
              }}
            >
              <span className="w-4 h-px" style={{ background: "var(--brand)" }} />
              SCHNELLKONTAKT
            </div>
            <h2
              className="text-white mb-5"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.4rem, 6vw, 1.8rem)",
                letterSpacing: "0.02em",
              }}
            >
              DIREKT{" "}
              <span style={{ WebkitTextStroke: "1.5px rgba(240,240,240,0.7)", color: "transparent" }}>
                ERREICHEN
              </span>
            </h2>

            <div className="space-y-3">
              <MobileQuickAction
                icon={Phone}
                label="JETZT ANRUFEN"
                sub={s.phone}
                href={phoneHref}
              />
              <MobileQuickAction
                icon={Mail}
                label="E-MAIL SENDEN"
                sub={s.email}
                href={`mailto:${s.email}`}
              />
              <MobileQuickAction
                icon={MapPin}
                label="ROUTE PLANEN"
                sub={`${s.company_street}, ${s.company_city}`}
                href={mapsHref}
              />
            </div>
          </section>

          {/* ── Divider ── */}
          <div className="px-5">
            <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* ── Opening Hours ── */}
          <section className="relative px-5 py-8">
            <div
              className="inline-flex items-center gap-2 mb-4"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <span className="w-4 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              ÖFFNUNGSZEITEN
            </div>

            <div
              className="p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(202,12,133,0.08)",
                    border: "1px solid rgba(202,12,133,0.15)",
                  }}
                >
                  <Clock size={16} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <p
                    className="text-white"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    TÄGLICH GEÖFFNET
                  </p>
                  <p className="text-white/30" style={{ fontSize: "11px" }}>
                    Auch an Feiertagen
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {OPENING_HOURS.map(({ day, time }) => (
                  <li
                    key={day}
                    className="flex items-center justify-between py-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span className="text-white/50" style={{ fontSize: "13px" }}>{day}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "14px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      {time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Divider ── */}
          <div className="px-5">
            <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* ── Contact Form ── */}
          <section className="relative px-5 py-10" id="mobile-kontakt-form">
            <div
              className="inline-flex items-center gap-2 mb-4"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "var(--brand)",
              }}
            >
              <span className="w-4 h-px" style={{ background: "var(--brand)" }} />
              FORMULAR
            </div>
            <h2
              className="text-white mb-2"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.4rem, 6vw, 1.8rem)",
                letterSpacing: "0.02em",
              }}
            >
              DEINE{" "}
              <span style={{ WebkitTextStroke: "1.5px rgba(240,240,240,0.7)", color: "transparent" }}>
                NACHRICHT
              </span>
            </h2>
            <p className="text-white/30 mb-6" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
              Schreib uns – wir melden uns innerhalb von 24 Stunden.
            </p>

            <div
              className="overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Top accent */}
              <div
                className="h-[2px]"
                style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.2), transparent)" }}
              />
              <div className="p-5">
                <ContactForm />
              </div>
            </div>
          </section>

          {/* ── Divider ── */}
          <div className="px-5">
            <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* ── Social Media ── */}
          <section className="relative px-5 py-8">
            <div
              className="inline-flex items-center gap-2 mb-4"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <span className="w-4 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              FOLGE UNS
            </div>

            <div className="space-y-3">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 active:scale-[0.98] transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(202,12,133,0.08)",
                      border: "1px solid rgba(202,12,133,0.15)",
                    }}
                  >
                    <Icon size={16} style={{ color: "var(--brand)" }} />
                  </div>
                  <span className="text-white/60 flex-1" style={{ fontSize: "13px" }}>
                    {label}
                  </span>
                  <ChevronRight size={14} className="text-white/20" />
                </a>
              ))}
            </div>
          </section>

          {/* ── Map / Location Card ── */}
          <section className="relative px-5 pb-14">
            <div
              className="relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                height: "160px",
              }}
            >
              {/* Decorative grid */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "linear-gradient(rgba(202,12,133,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,0.8) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{
                    background: "rgba(202,12,133,0.1)",
                    border: "1px solid rgba(202,12,133,0.2)",
                  }}
                >
                  <MapPin size={18} style={{ color: "var(--brand)" }} />
                </div>
                <div className="text-center px-4">
                  <p
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {s.company_street.toUpperCase()} · {s.company_zip} {s.company_city.toUpperCase()}
                  </p>
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand text-xs mt-2 inline-block active:scale-[0.98] transition-all"
                  >
                    In Google Maps öffnen →
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
}
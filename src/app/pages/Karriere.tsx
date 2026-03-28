import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useLocation } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft, ArrowRight, Briefcase, Clock, MapPin,
  Zap, Heart, Trophy, Users, Star, ChevronRight, Send,
  Loader2, Upload, CheckCircle2, X, Lock, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { PageMeta } from "../components/seo/PageMeta";
import { PageHero, ScanLine, Particle } from "../components/ui/legal-page";
import { api } from "../../lib/api-service";

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Heart, Trophy, Users, Star, MapPin, Briefcase, Clock, Send,
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Job {
  id: number;
  title: string;
  department: string;
  employmentType: string;
  level: string;
  location: string;
  description: string;
  tags: string[];
  active: boolean;
}
interface Benefit {
  id: number;
  icon: string;
  title: string;
  description: string;
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden p-6 flex flex-col gap-4 transition-all duration-300"
      style={{
        background: hovered
          ? "linear-gradient(135deg, rgba(202,12,133,0.07) 0%, rgba(17,17,17,0.98) 60%)"
          : "var(--surface-2)",
        border: hovered ? "1px solid rgba(202,12,133,0.35)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hovered ? "0 0 40px rgba(202,12,133,0.1)" : "none",
      }}
    >
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute top-0 left-0 right-0 h-[2px] origin-left"
        style={{ background: "linear-gradient(90deg, #CA0C85, rgba(202,12,133,0.3))" }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5"
              style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "var(--brand)" }}>
              {job.department.toUpperCase()}
            </span>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)" }}>
              {job.level.toUpperCase()}
            </span>
          </div>
          <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", letterSpacing: "0.03em", lineHeight: 1.15 }}>
            {job.title}
          </h3>
        </div>
        <div className="shrink-0 flex items-center gap-1 text-white/35"
          style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em" }}>
          <Clock size={11} />
          {job.employmentType}
        </div>
      </div>

      <p className="text-white/55 text-sm leading-relaxed">{job.description}</p>

      <div className="flex flex-wrap gap-2">
        {job.tags.map((tag) => (
          <span key={tag} className="px-2.5 py-1 text-xs text-white/40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-1.5 text-white/30 text-xs">
          <MapPin size={10} />
          {job.location}
        </div>
        <Link
          to={`/karriere?apply=${job.id}`}
          className="group inline-flex items-center gap-2 px-5 py-2.5 text-white transition-all duration-200 active:scale-[0.98]"
          style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(202,12,133,0.35)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          BEWERBEN
          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}

// ── Benefit Card ──────────────────────────────────────────────────────────────
function BenefitCard({ benefit }: { benefit: Benefit }) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICON_MAP[benefit.icon] ?? Zap;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-5 transition-all duration-300"
      style={{
        background: hovered ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.02)",
        border: hovered ? "1px solid rgba(202,12,133,0.25)" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="w-9 h-9 flex items-center justify-center mb-4"
        style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}>
        <Icon size={15} style={{ color: "var(--brand)" }} />
      </div>
      <p className="text-white mb-2"
        style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}>
        {benefit.title}
      </p>
      <p className="text-white/50 text-xs leading-relaxed">{benefit.description}</p>
    </motion.div>
  );
}

// ── Application Form ──────────────────────────────────────────────────────────
function ApplicationForm({ jobId, jobTitle, onClose }: { jobId: number | null; jobTitle: string; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", birthDate: "",
    street: "", zip: "", city: "", country: "Deutschland",
    locationPref: "Göppingen", startDate: "", noticePeriod: "",
    flexibilityKm: "50", profession: "", education: "", training: "",
    source: "", coverLetter: "",
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("Bitte fülle alle Pflichtfelder aus.");
      return;
    }
    setSubmitting(true);
    try {
      await api.public.submitApplication({ ...form, jobId, flexibilityKm: parseInt(form.flexibilityKm) || 50 });
      setSubmitted(true);
      toast.success("Bewerbung erfolgreich eingereicht!");
    } catch {
      toast.error("Fehler beim Senden. Bitte versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="pt-36 pb-24" style={{ backgroundColor: "var(--surface-0)" }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <CheckCircle2 size={48} style={{ color: "var(--brand)", margin: "0 auto 16px" }} />
          <h2 className="text-white mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            BEWERBUNG EINGEGANGEN!
          </h2>
          <p className="text-white/50 mb-8">Vielen Dank für deine Bewerbung. Wir melden uns innerhalb von 72 Stunden bei dir.</p>
          <button onClick={onClose} className="px-6 py-3 text-white cursor-pointer"
            style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", border: "none" }}>
            ZURÜCK ZU DEN STELLEN
          </button>
        </div>
      </section>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: "white", padding: "10px 14px", fontSize: "14px", width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px",
  };

  return (
    <section className="pt-36 pb-24" style={{ backgroundColor: "var(--surface-0)" }}>
      <div className="max-w-3xl mx-auto px-6">
        <button onClick={onClose} className="inline-flex items-center gap-2 mb-8 text-white/40 hover:text-white transition-colors cursor-pointer"
          style={{ background: "none", border: "none", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em" }}>
          <ArrowLeft size={14} /> ZURÜCK
        </button>

        <h1 className="text-white mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem,5vw,2.8rem)" }}>
          BEWERBUNG
        </h1>
        <p className="text-white/50 text-sm mb-8">
          {jobTitle ? `Stelle: ${jobTitle}` : "Initiativbewerbung"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Kontakt */}
          <div>
            <div className="px-4 py-2 mb-4" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "2px solid rgba(202,12,133,0.3)" }}>
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)" }}>KONTAKT</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label style={labelStyle}>Vorname *</label><input required value={form.firstName} onChange={e => set("firstName", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Nachname *</label><input required value={form.lastName} onChange={e => set("lastName", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Geburtsdatum</label><input type="date" value={form.birthDate} onChange={e => set("birthDate", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>E-Mail *</label><input required type="email" value={form.email} onChange={e => set("email", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Mobil</label><input value={form.phone} onChange={e => set("phone", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Straße / Hausnummer</label><input value={form.street} onChange={e => set("street", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Postleitzahl</label><input value={form.zip} onChange={e => set("zip", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Wohnort</label><input value={form.city} onChange={e => set("city", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Land</label>
                <select value={form.country} onChange={e => set("country", e.target.value)} style={inputStyle}>
                  <option value="Deutschland">Deutschland</option><option value="Österreich">Österreich</option><option value="Schweiz">Schweiz</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fakten */}
          <div>
            <div className="px-4 py-2 mb-4" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "2px solid rgba(202,12,133,0.3)" }}>
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)" }}>FAKTEN</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label style={labelStyle}>Standort *</label>
                <select value={form.locationPref} onChange={e => set("locationPref", e.target.value)} style={inputStyle}>
                  <option value="Göppingen">Göppingen</option><option value="Eislingen">Eislingen</option><option value="Beide">Beide Standorte</option>
                </select>
              </div>
              <div><label style={labelStyle}>Möglicher Arbeitsbeginn</label><input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Kündigungsfrist</label><input value={form.noticePeriod} onChange={e => set("noticePeriod", e.target.value)} style={inputStyle} placeholder="z.B. 3 Monate" /></div>
              <div><label style={labelStyle}>Regionale Flexibilität (km)</label><input type="number" value={form.flexibilityKm} onChange={e => set("flexibilityKm", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Erlernter Beruf</label><input value={form.profession} onChange={e => set("profession", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Höchster Schulabschluss</label>
                <select value={form.education} onChange={e => set("education", e.target.value)} style={inputStyle}>
                  <option value="">Bitte wählen...</option><option value="Hauptschule">Hauptschulabschluss</option><option value="Realschule">Mittlere Reife</option><option value="Abitur">Abitur</option><option value="Fachabitur">Fachabitur</option>
                </select>
              </div>
              <div><label style={labelStyle}>Höchster Ausbildungsabschluss</label>
                <select value={form.training} onChange={e => set("training", e.target.value)} style={inputStyle}>
                  <option value="">Bitte wählen...</option><option value="Ausbildung">Ausbildung</option><option value="Bachelor">Bachelor</option><option value="Master">Master</option><option value="Sonstiges">Sonstiges</option>
                </select>
              </div>
              <div><label style={labelStyle}>Wie auf uns aufmerksam geworden? *</label>
                <select required value={form.source} onChange={e => set("source", e.target.value)} style={inputStyle}>
                  <option value="">Bitte wählen...</option><option value="Website">Website</option><option value="Instagram">Instagram</option><option value="Empfehlung">Empfehlung</option><option value="Indeed">Indeed</option><option value="Google">Google</option><option value="Sonstiges">Sonstiges</option>
                </select>
              </div>
            </div>
          </div>

          {/* Motivation */}
          <div>
            <div className="px-4 py-2 mb-4" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "2px solid rgba(202,12,133,0.3)" }}>
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)" }}>WARUM NICE ATHLETIC CLUB?</span>
            </div>
            <textarea value={form.coverLetter} onChange={e => set("coverLetter", e.target.value)}
              placeholder="Was motiviert dich, Teil unseres Teams zu werden? (max. 500 Zeichen)"
              maxLength={500} rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <p className="text-white/20 text-xs mt-1 text-right">{form.coverLetter.length}/500</p>
          </div>

          {/* Datenschutz & Submit */}
          <div className="flex flex-col gap-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" required className="mt-1 accent-[#CA0C85]" />
              <span className="text-white/40 text-xs leading-relaxed">
                Ich habe die <Link to="/datenschutz" className="text-white/60 underline">Datenschutzerklärung</Link> gelesen und akzeptiert.
              </span>
            </label>

            <button type="submit" disabled={submitting}
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-white transition-all duration-300 active:scale-[0.98] cursor-pointer"
              style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", border: "none", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              BEWERBUNG ABSENDEN
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

// ── No Jobs State ─────────────────────────────────────────────────────────────
function NoJobsState() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative py-12 overflow-hidden"
    >
      {/* Ghost background text */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(5rem, 18vw, 14rem)",
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: "1px rgba(202,12,133,0.07)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          PAUSE
        </span>
      </div>

      {/* Scan line animation */}
      {!reduced && (
        <motion.div
          className="absolute inset-x-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(202,12,133,0.25), transparent)" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Center card */}
      <div className="relative max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(202,12,133,0.18)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Top glow bar */}
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(202,12,133,0.6), transparent)" }}
          />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: "rgba(202,12,133,0.5)" }} />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: "rgba(202,12,133,0.5)" }} />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: "rgba(202,12,133,0.5)" }} />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: "rgba(202,12,133,0.5)" }} />

          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(202,12,133,0.08) 0%, transparent 65%)" }}
          />

          <div className="relative px-8 pt-12 pb-10 text-center">
            {/* Icon with pulse ring */}
            <div className="relative inline-flex items-center justify-center mb-8">
              {!reduced && (
                <>
                  <motion.div
                    className="absolute rounded-full"
                    style={{ width: 80, height: 80, border: "1px solid rgba(202,12,133,0.2)" }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute rounded-full"
                    style={{ width: 80, height: 80, border: "1px solid rgba(202,12,133,0.15)" }}
                    animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                  />
                </>
              )}
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  background: "rgba(202,12,133,0.08)",
                  border: "1px solid rgba(202,12,133,0.25)",
                }}
              >
                <Lock size={24} style={{ color: "rgba(202,12,133,0.7)" }} />
              </div>
            </div>

            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6"
              style={{
                background: "rgba(202,12,133,0.08)",
                border: "1px solid rgba(202,12,133,0.2)",
                fontFamily: "var(--font-condensed)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: "var(--brand)",
              }}
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: "var(--brand)" }}
                animate={reduced ? {} : { opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              AKTUELL KEINE STELLEN AUSGESCHRIEBEN
            </div>

            {/* Headline */}
            <h3
              className="text-white mb-4"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
                letterSpacing: "0.03em",
                lineHeight: 1.1,
              }}
            >
              MOMENTAN WERDEN KEINE<br />
              <span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.5)", color: "transparent" }}>
                JOBS ODER AUSBILDUNGSPLÄTZE
              </span>
              <br />
              VERGEBEN
            </h3>

            {/* Body text */}
            <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
              Das Team ist aktuell vollständig. Aber wer sagt, dass das so bleibt?<br />
              Schick uns deine <strong className="text-white/60">Initiativbewerbung</strong> – wir wachsen stetig und melden uns, sobald etwas passt.
            </p>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.2)" }}>
                TROTZDEM MELDEN?
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/karriere?apply=init"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-white transition-all duration-300 active:scale-[0.98]"
                style={{
                  background: "var(--brand)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--brand-light)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(202,12,133,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--brand)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <Send size={12} />
                INITIATIVBEWERBUNG
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/kontakt"
                className="group inline-flex items-center gap-2 px-7 py-3.5 text-white/60 hover:text-white transition-all duration-300 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <Bell size={12} />
                KONTAKT AUFNEHMEN
              </Link>
            </div>

            {/* Bottom hint */}
            <p className="mt-6 text-white/20 text-xs" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.06em" }}>
              Wir prüfen alle Initiativbewerbungen und melden uns bei passender Gelegenheit.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Karriere() {
  const reduced = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const applyId = searchParams.get("apply");

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);

  const loadData = useCallback(() => {
    setLoading(true);
    api.public.karriere()
      .then((res: any) => {
        // API gibt bereits nur aktive Jobs zurück (PHP filtert server-seitig).
        // Im Mock-Modus filtert auch _getMockKarriereStore → nur active:true.
        // Sicherheits-Filter bleibt trotzdem erhalten.
        if (res?.jobs) setJobs((res.jobs as Job[]).filter((j) => j.active));
        if (res?.benefits) setBenefits(res.benefits);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Daten bei jedem Seitenaufruf (location.key) frisch laden.
  // So wird der Effekt des Admin-Toggles sofort sichtbar wenn der User
  // zurück zu /karriere navigiert – ohne kompletten Seiten-Reload.
  useEffect(() => {
    loadData();
  }, [loadData, location.key]);

  // Application form mode
  if (applyId) {
    const jid = applyId === "init" ? null : parseInt(applyId);
    const job = jobs.find(j => j.id === jid);
    return (
      <>
        <PageMeta title="Bewerbung | Nice Athletic Club" description="Bewirb dich jetzt beim Nice Athletic Club Göppingen." />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <ApplicationForm jobId={jid} jobTitle={job?.title ?? ""} onClose={() => setSearchParams({})} />
        </motion.div>
      </>
    );
  }

  const hasJobs = jobs.length > 0;

  return (
    <>
      <PageMeta
        title="Jobs & Karriere im Fitnessstudio Göppingen | Nice Athletic Club"
        description="Werde Teil des NAC-Teams in Göppingen! Offene Stellen als Trainer, Coach & mehr. Bewirb dich jetzt beim Nice Athletic Club – wir suchen Menschen mit Leidenschaft für Fitness."
        canonical="https://nicefitness.de/karriere"
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <PageHero
          ghostText="KARRIERE"
          label="JOBS & KARRIERE"
          titleA="JOIN THE"
          titleB=" TEAM"
          subtitle="Werde Teil einer Fitness-Community die brennt. Göppingen braucht die Besten — bist du dabei?"
          badges={[
            { label: "OFFENE\nSTELLEN", val: `${jobs.length}` },
            { label: "STANDORT", val: "GPP" },
          ]}
          mobileTitle="Karriere"
          mobileCta={{ label: "JETZT BEWERBEN", to: hasJobs ? "/karriere?apply=init" : "/kontakt" }}
        />

        {/* ── Jobs ── */}
        <section className="pt-16 pb-10" style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="relative max-w-5xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-8">
              <div className="inline-flex items-center gap-2 mb-3"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                <span className="w-5 h-px" style={{ background: "var(--brand)" }} />
                OFFENE STELLEN
              </div>
              <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem,5vw,2.8rem)" }}>
                {hasJobs ? "AKTUELL GESUCHT" : "AKTUELL KEINE STELLEN"}
              </h2>
            </motion.div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-white/30" />
              </div>
            ) : hasJobs ? (
              <div className="space-y-4">
                {jobs.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            ) : (
              <NoJobsState />
            )}

            {/* Initiativbewerbung */}
            {hasJobs && (
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
                className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-6"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                <div>
                  <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.08em" }}>
                    Keine passende Stelle dabei?
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">Schick uns deine Initiativbewerbung – wir wachsen.</p>
                </div>
                <Link to="/karriere?apply=init"
                  className="group inline-flex items-center gap-2 px-6 py-3 text-white shrink-0 transition-all duration-200"
                  style={{ border: "1px solid rgba(202,12,133,0.3)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.7)"; (e.currentTarget as HTMLElement).style.background = "rgba(202,12,133,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.3)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <Send size={12} /> INITIATIVBEWERBUNG
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── Benefits ── */}
        {benefits.length > 0 && (
          <section className="relative py-16" style={{ backgroundColor: "var(--surface-0)" }}>
            <div className="relative max-w-5xl mx-auto px-6">
              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-8">
                <div className="inline-flex items-center gap-2 mb-3"
                  style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                  <span className="w-5 h-px" style={{ background: "var(--brand)" }} /> WARUM NAC
                </div>
                <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem,5vw,2.8rem)" }}>
                  DEINE BENEFITS
                </h2>
              </motion.div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {benefits.map((b) => <BenefitCard key={b.id} benefit={b} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA Banner ── */}
        <section className="relative pb-24" style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="relative max-w-5xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="relative overflow-hidden p-10 text-center"
              style={{ background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.22)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, rgba(202,12,133,0.1) 0%, transparent 65%)" }} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                <Briefcase size={200} style={{ color: "rgba(202,12,133,0.04)", strokeWidth: 0.5 }} />
              </div>
              <div className="relative">
                <p className="text-white mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem,5vw,3rem)", letterSpacing: "0.02em" }}>
                  BEREIT FÜR <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>DEN NÄCHSTEN SCHRITT?</span>
                </p>
                <p className="text-white/50 text-sm mb-8 max-w-md mx-auto">
                  Schick uns deine Bewerbung direkt über unser Formular. Wir melden uns innerhalb von 72 Stunden.
                </p>
                <Link to={hasJobs ? "/karriere?apply=init" : "/kontakt"}
                  className="group inline-flex items-center gap-3 px-8 py-4 text-white transition-all duration-300 active:scale-[0.98]"
                  style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(202,12,133,0.4)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  JETZT BEWERBEN
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </>
  );
}
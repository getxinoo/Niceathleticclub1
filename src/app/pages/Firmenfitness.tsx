import { useRef } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useInView } from "motion/react";
import {
  ArrowRight,
  Building2,
  Users,
  Heart,
  TrendingUp,
  CheckCircle2,
  Award,
  Briefcase,
  Clock,
  BarChart3,
  Shield,
  Zap,
  Mail,
  Phone,
  Dumbbell,
  Brain,
  Euro,
  Percent,
  BadgeCheck,
  CalendarCheck,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Leaf,
  Target,
  FileText,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

// ── Images ────────────────────────────────────────────────────────────────────
const IMG_HERO =
  "https://images.unsplash.com/photo-1612073584622-335da5fadd8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjB0ZWFtJTIwZ3JvdXAlMjB3b3Jrb3V0JTIwZ3ltfGVufDF8fHx8MTc3MzY4MTkyNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const IMG_PROCESS =
  "https://images.unsplash.com/photo-1758875569414-120ebc62ada3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMHRyYWluZXIlMjBjb2FjaGluZyUyMHNlc3Npb24lMjBneW18ZW58MXx8fHwxNzczNjgxOTI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const IMG_CROSSFIT =
  "https://images.unsplash.com/photo-1758875569517-559a631fb44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcm9zc2ZpdCUyMGZ1bmN0aW9uYWwlMjB0cmFpbmluZyUyMGdyb3VwJTIwY2xhc3N8ZW58MXx8fHwxNzczNjgxOTI5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const IMG_YOGA =
  "https://images.unsplash.com/photo-1763403921315-f2ef8697199f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwY2xhc3MlMjBncm91cCUyMGZpdG5lc3MlMjBzdHVkaW98ZW58MXx8fHwxNzczNjgxOTI3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const IMG_WELLNESS =
  "https://images.unsplash.com/photo-1698006150156-3779d5c2306c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjB3b3JrZXJzJTIwc3RyZXRjaGluZyUyMHdlbGxuZXNzJTIwYnJlYWt8ZW58MXx8fHwxNzczNjgxOTI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const IMG_HAPPY =
  "https://images.unsplash.com/photo-1758520144661-73849bde0da1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZW1wbG95ZWVzJTIwcHJvZHVjdGl2aXR5JTIwaGFwcHl8ZW58MXx8fHwxNzczNjgxOTMwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

// ── Animation helpers ─────────────────────────────────────────────────────────
const makeVariants = (reduced: boolean | null) => ({
  fadeUp: {
    hidden: { opacity: 0, y: reduced ? 0 : 32 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  stagger: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  },
});

// ── Reusable Label ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
      <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
    </div>
  );
}

// ── Vorteile für Unternehmen ──────────────────────────────────────────────────
const COMPANY_BENEFITS = [
  {
    icon: TrendingUp,
    title: "Weniger Krankentage",
    desc: "Unternehmen mit BGM-Programmen verzeichnen bis zu 30 % weniger Krankheitstage. Jeder investierte Euro spart durchschnittlich 2,70 € an Fehlzeitenkosten.",
    stat: "–30%",
  },
  {
    icon: Heart,
    title: "Höhere Mitarbeiterbindung",
    desc: "84 % der Arbeitnehmer bewerten Gesundheitsangebote als wichtigen Faktor bei der Arbeitgeberwahl. Geringere Fluktuation spart Recruiting-Kosten.",
    stat: "84%",
  },
  {
    icon: Zap,
    title: "Mehr Produktivität",
    desc: "Regelmäßig aktive Mitarbeiter sind bis zu 15 % produktiver. Fitness steigert Konzentration, Energie und Stressresistenz messbar.",
    stat: "+15%",
  },
  {
    icon: Users,
    title: "Stärkerer Teamgeist",
    desc: "Gemeinsame Workouts und Team-Events fördern den Zusammenhalt und die Kommunikation zwischen Abteilungen – auch crossfunktional.",
    stat: null,
  },
  {
    icon: Award,
    title: "Employer Branding",
    desc: "Positioniere dich als moderner, attraktiver Arbeitgeber. Ein Fitness-Benefit ist ein starkes Signal im Kampf um Fachkräfte.",
    stat: null,
  },
  {
    icon: Brain,
    title: "Mental Health",
    desc: "Sport reduziert Stresshormone um bis zu 40 % und beugt Burnout vor. Psychische Gesundheit ist der #1 Grund für Langzeit-Krankschreibungen.",
    stat: "–40%",
  },
];

// ── Steuervorteile ────────────────────────────────────────────────────────────
const TAX_BENEFITS = [
  {
    icon: Euro,
    title: "600 € Freibetrag pro Mitarbeiter/Jahr",
    paragraph: "§ 3 Nr. 34 EStG",
    desc: "Arbeitgeber können pro Mitarbeiter und Kalenderjahr bis zu 600 € steuerfrei für Maßnahmen der Gesundheitsförderung ausgeben. Das umfasst Fitnessmitgliedschaften, Kurse, Ernährungsberatung und Stressprävention – komplett steuer- und sozialabgabenfrei für beide Seiten.",
    highlight: "Steuer- und sozialabgabenfrei",
  },
  {
    icon: HandCoins,
    title: "50 € Sachbezugsfreigrenze/Monat",
    paragraph: "§ 8 Abs. 2 S. 11 EStG",
    desc: "Zusätzlich zum 600-€-Freibetrag kann der Arbeitgeber monatlich bis zu 50 € als Sachbezug gewähren – z. B. als Zuschuss zur Fitnessmitgliedschaft. Bei 12 Monaten sind das weitere 600 € pro Jahr, steuer- und sozialabgabenfrei.",
    highlight: "Bis zu 1.200 € kombiniert pro Jahr",
  },
  {
    icon: FileText,
    title: "Volle Betriebsausgabe",
    paragraph: "§ 4 Abs. 4 EStG",
    desc: "Alle Ausgaben für betriebliches Gesundheitsmanagement sind als Betriebsausgaben voll abzugsfähig. Das reduziert den zu versteuernden Gewinn und damit die Steuerlast des Unternehmens direkt.",
    highlight: "Gewinnmindernd absetzbar",
  },
  {
    icon: Shield,
    title: "Unfallversicherung & Prävention",
    paragraph: "§ 3 Nr. 34 EStG / SGB VII",
    desc: "Gesundheitsfördernde Maßnahmen können auch im Rahmen der gesetzlichen Unfallversicherung (DGUV) gefördert werden. Betriebliche Gesundheitsförderung senkt das Unfallrisiko und die BG-Beiträge langfristig.",
    highlight: "BG-Beiträge senken",
  },
];

// ── Angebote für Firmen ───────────────────────────────────────────────────────
const CORPORATE_OFFERINGS = [
  {
    icon: Dumbbell,
    title: "Firmenmitgliedschaften",
    desc: "Vergünstigte Mitgliedschaften für eure gesamte Belegschaft. Zugang zu allen Trainingsbereichen inkl. Athletic Area, CrossFit Box, HYROX Zone und Wellness.",
    features: ["Sonderkonditionen ab 5 Mitarbeitern", "Keine Mindestvertragslaufzeit", "Flexible Zu- und Abgänge", "Monatliche Abrechnung"],
    image: IMG_HERO,
  },
  {
    icon: Users,
    title: "Team-Workouts & CrossFit",
    desc: "Exklusive Firmen-Workouts in unserer CrossFit Box oder Athletic Area. Perfekt als regelmäßiges Team-Event oder einmalige Teambuilding-Aktion.",
    features: ["Dedizierter Coach für eure Gruppe", "Individuelle Workout-Planung", "Ab 8 Personen buchbar", "Auch als After-Work-Event"],
    image: IMG_CROSSFIT,
  },
  {
    icon: GraduationCap,
    title: "Gesundheitstage & Workshops",
    desc: "Ganztägige oder halbtägige Programme direkt bei euch im Unternehmen oder bei uns im NICE. Themen: Rückengesundheit, Ergonomie, Ernährung, Stressmanagement.",
    features: ["Vor Ort oder im NICE durchführbar", "Zertifizierte Trainer & Coaches", "Inkl. Materialien & Handouts", "BGM/BGF-konform nach § 20 SGB V"],
    image: IMG_WELLNESS,
  },
  {
    icon: HeartPulse,
    title: "Personal Training für Führungskräfte",
    desc: "Exklusives 1:1 Coaching für C-Level und Management. Leistungsoptimierung, Stressresilienz und körperliche Fitness auf höchstem Niveau.",
    features: ["Individuelle Trainingsplanung", "Ernährungs-Coaching inklusive", "Flexible Terminplanung", "Auch als Online-Coaching"],
    image: IMG_PROCESS,
  },
  {
    icon: Leaf,
    title: "Mobility & Rücken-Fit",
    desc: "Gezielte Mobility- und Rückenpräventions-Sessions für mehr Beweglichkeit und weniger Verspannungen – ideal als Ausgleich zum Büroalltag und Schreibtischarbeit.",
    features: ["Anfänger-freundlich", "30- oder 60-Minuten-Format", "Auch in der Mittagspause möglich", "Equipment wird gestellt"],
    image: "https://images.unsplash.com/photo-1614928228253-dc09cbc3b11c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJldGNoaW5nJTIwbW9iaWxpdHklMjBmdW5jdGlvbmFsJTIwdHJhaW5pbmclMjBneW18ZW58MXx8fHwxNzczNjgyMjY4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    icon: Target,
    title: "Firmenlauf & Event-Vorbereitung",
    desc: "Strukturierte Trainingspläne für Firmenläufe, Charity-Events oder HYROX-Teilnahmen als Team. Motivation durch gemeinsame Ziele.",
    features: ["8–12 Wochen Vorbereitungsprogramm", "Gemeinsame Trainingseinheiten", "Performance-Tracking", "Trikot-Design & Branding möglich"],
    image: IMG_HAPPY,
  },
];

// ── Process ───────────────────────────────────────────────────────────────────
const PROCESS = [
  { step: "01", title: "Erstgespräch", desc: "Wir lernen euer Unternehmen kennen – Teamgröße, Ziele, Budget. Kostenlos und unverbindlich, telefonisch oder vor Ort." },
  { step: "02", title: "Individuelles Angebot", desc: "Ihr erhaltet ein maßgeschneidertes Paket mit transparenten Konditionen, steuerlichen Hinweisen und klarer Kostenaufstellung." },
  { step: "03", title: "Onboarding & Kick-Off", desc: "Eure Mitarbeiter bekommen eine persönliche Einführung, Fitness-Checks und ihren Zugang zum NICE Athletic Club." },
  { step: "04", title: "Laufende Betreuung", desc: "Dedizierter Ansprechpartner, quartalsweise Reports über Nutzung und Gesundheitskennzahlen, kontinuierliche Optimierung." },
];

// ── ROI-Statistiken ───────────────────────────────────────────────────────────
const ROI_STATS = [
  { value: "1:3", label: "Return on Investment", sub: "Jeder investierte Euro kommt 3-fach zurück" },
  { value: "30%", label: "Weniger Krankentage", sub: "Durchschnitt bei aktiven BGM-Programmen" },
  { value: "600€", label: "Steuerfrei pro MA/Jahr", sub: "Gesundheitsförderung nach § 3 Nr. 34 EStG" },
  { value: "25%", label: "Geringere Fluktuation", sub: "Mitarbeiterbindung durch Benefits" },
];

// ── Trust ─────────────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  "Lokale Unternehmen aus Göppingen",
  "Handwerksbetriebe & Mittelstand",
  "Steuerberater & Kanzleien",
  "IT-Unternehmen & Agenturen",
  "Arztpraxen & Gesundheitswesen",
  "Automobilzulieferer",
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Firmenfitness() {
  const reduced = useReducedMotion();
  const v = makeVariants(reduced);

  const benefitsRef = useRef<HTMLDivElement>(null);
  const benefitsInView = useInView(benefitsRef, { once: true, margin: "-80px" });

  const taxRef = useRef<HTMLDivElement>(null);
  const taxInView = useInView(taxRef, { once: true, margin: "-80px" });

  const offeringsRef = useRef<HTMLDivElement>(null);
  const offeringsInView = useInView(offeringsRef, { once: true, margin: "-80px" });

  const processRef = useRef<HTMLDivElement>(null);
  const processInView = useInView(processRef, { once: true, margin: "-80px" });

  const roiRef = useRef<HTMLDivElement>(null);
  const roiInView = useInView(roiRef, { once: true, margin: "-80px" });

  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  return (
    <>
      <PageMeta
        title="Firmenfitness – Nice Athletic Club"
        description="Premium Firmenfitness in Göppingen: Steuerfreie Gesundheitsförderung (§ 3 Nr. 34 EStG), Team-Workouts, BGM-konforme Kurse, Personal Training für Führungskräfte und vergünstigte Firmenmitgliedschaften."
        canonical="https://niceathleticclub.de/firmenfitness"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="relative"
        style={{ backgroundColor: "var(--surface-0)" }}
      >
        {/* ══════════════════════════════════════════════════════════════════════
            HERO — DESKTOP (sm+)
            ══════════════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden hidden sm:block" style={{ paddingTop: "144px", paddingBottom: "80px" }}>
          <div
            className="absolute top-0 left-0 w-[600px] h-[500px] pointer-events-none"
            aria-hidden="true"
            style={{ background: "radial-gradient(ellipse at top left, rgba(202,12,133,0.14), transparent 65%)" }}
          />
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[400px] pointer-events-none"
            aria-hidden="true"
            style={{ background: "radial-gradient(ellipse at bottom right, rgba(202,12,133,0.06), transparent 65%)" }}
          />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div variants={v.stagger} initial="hidden" animate="visible">
                <motion.div variants={v.fadeUp} custom={0}>
                  <Label>Firmenfitness &amp; BGM</Label>
                </motion.div>
                <motion.h1
                  variants={v.fadeUp}
                  custom={1}
                  className="text-white mb-6"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2.8rem, 7vw, 5rem)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    lineHeight: 0.95,
                  }}
                >
                  STARKES TEAM.{" "}
                  <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>STARKES</span>
                  <br />UNTERNEHMEN.
                </motion.h1>
                <motion.p
                  variants={v.fadeUp}
                  custom={2}
                  className="max-w-lg leading-relaxed mb-8"
                  style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)" }}
                >
                  Investiere in die Gesundheit deines Teams – und profitiere mehrfach: weniger
                  Krankheitstage, höhere Produktivität, stärkere Mitarbeiterbindung und bis zu
                  1.200 € steuerfreie Förderung pro Mitarbeiter und Jahr.
                </motion.p>

                {/* Quick Stats */}
                <motion.div variants={v.fadeUp} custom={3} className="flex flex-wrap gap-6 mb-8">
                  {[
                    { value: "600€", label: "Steuerfrei/MA/Jahr" },
                    { value: "1:3", label: "ROI Verhältnis" },
                    { value: "–30%", label: "Krankentage" },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <span
                        className="text-white block"
                        style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", lineHeight: 1, letterSpacing: "0.02em" }}
                      >
                        {value}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "9px",
                          fontWeight: 600,
                          letterSpacing: "0.14em",
                          color: "rgba(255,255,255,0.3)",
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </motion.div>

                <motion.div variants={v.fadeUp} custom={4} className="flex flex-wrap gap-4">
                  <Link
                    to="/kontakt"
                    className="inline-flex items-center gap-2 text-white transition-all duration-200 active:scale-[0.98]"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "14px 28px",
                      background: "var(--brand)",
                      minHeight: "48px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    Kostenloses Erstgespräch <ArrowRight size={14} />
                  </Link>
                  <a
                    href="mailto:info@nice-fitness.de?subject=Firmenfitness%20Anfrage"
                    className="inline-flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "14px 28px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.7)",
                      minHeight: "48px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--brand)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    }}
                  >
                    <Mail size={14} /> E-Mail schreiben
                  </a>
                </motion.div>
              </motion.div>

              {/* Hero Image */}
              <motion.div
                initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative"
              >
                <div className="relative overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <ImageWithFallback
                    src={IMG_HERO}
                    alt="Firmenfitness Team Training im Nice Athletic Club"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(5,5,5,0.6) 0%, transparent 50%)" }}
                  />
                </div>
                <div
                  className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-4 py-2"
                  style={{
                    background: "rgba(5,5,5,0.8)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(202,12,133,0.3)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--brand)",
                  }}
                >
                  <Building2 size={12} /> B2B Partner-Programm
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            HERO — MOBILE (< sm)
            ══════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative min-h-screen flex items-end overflow-hidden sm:hidden"
          style={{ backgroundColor: "#050505" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-full h-[40vh] pointer-events-none"
            style={{ background: "linear-gradient(to top, #050505, transparent)" }} />

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
                <span className="text-white/60">FIRMENFITNESS</span>
              </nav>

              <Label>Firmenfitness & BGM</Label>

              <h1 className="text-white mb-4" style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(2.6rem, 12vw, 4rem)",
                lineHeight: 0.9, letterSpacing: "0.02em", textTransform: "uppercase",
              }}>
                STARKES TEAM.{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>STARKES</span>{" "}
                UNTERNEHMEN.
              </h1>

              <p className="text-white/40 leading-relaxed mb-6 max-w-xs" style={{ fontSize: "0.85rem" }}>
                Investiere in die Gesundheit deines Teams – weniger Krankheitstage, höhere Produktivität.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { val: "600€", lbl: "Steuerfrei/Jahr" },
                  { val: "1:3", lbl: "ROI" },
                  { val: "–30%", lbl: "Krankentage" },
                ].map((s) => (
                  <div key={s.lbl} className="text-center py-3"
                    style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", lineHeight: 1 }}>{s.val}</span>
                    <span style={{ fontFamily: "var(--font-condensed)", fontSize: "7px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{s.lbl}</span>
                  </div>
                ))}
              </div>

              <Link to="/kontakt"
                className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300"
                style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}>
                KOSTENLOSES ERSTGESPRÄCH <ArrowRight size={16} />
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex justify-center mt-6">
              <motion.div animate={reduced ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                <ChevronDown size={18} className="text-white/20" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            VORTEILE FÜR UNTERNEHMEN
            ══════════════════════════════════════════════════════════════════════ */}
        <section ref={benefitsRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="text-center mb-16"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Vorteile für Unternehmen</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                WARUM <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>FIRMENFITNESS</span>?
              </motion.h2>
              <motion.p
                variants={v.fadeUp}
                custom={2}
                className="max-w-2xl mx-auto"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}
              >
                Betriebliche Gesundheitsförderung ist kein Kostenfaktor – sondern eine der
                rentabelsten Investitionen, die ein Unternehmen tätigen kann.
              </motion.p>
            </motion.div>

            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {COMPANY_BENEFITS.map(({ icon: Icon, title, desc, stat }, i) => (
                <motion.div
                  key={title}
                  variants={v.fadeUp}
                  custom={i}
                  className="group p-6 transition-all duration-300 relative overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {stat && (
                    <div
                      className="absolute top-4 right-4"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "2.2rem",
                        color: "rgba(202,12,133,0.08)",
                        lineHeight: 1,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {stat}
                    </div>
                  )}
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-4"
                    style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                  >
                    <Icon size={18} style={{ color: "var(--brand)" }} />
                  </div>
                  <h3
                    className="text-white mb-2"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.2rem",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                    {desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            STEUERVORTEILE
            ══════════════════════════════════════════════════════════════════════ */}
        <section ref={taxRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{ background: "linear-gradient(180deg, rgba(202,12,133,0.03) 0%, transparent 50%)" }}
          />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={taxInView ? "visible" : "hidden"}
              className="text-center mb-16"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Steuervorteile</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                GESUNDHEIT{" "}
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>STEUERLICH</span>{" "}
                ABSETZBAR
              </motion.h2>
              <motion.p
                variants={v.fadeUp}
                custom={2}
                className="max-w-2xl mx-auto"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}
              >
                Der Gesetzgeber fördert betriebliche Gesundheitsmaßnahmen gezielt. Nutzt die
                steuerlichen Vorteile und macht Fitness für euer Team zum Win-Win.
              </motion.p>
            </motion.div>

            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={taxInView ? "visible" : "hidden"}
              className="grid md:grid-cols-2 gap-5"
            >
              {TAX_BENEFITS.map(({ icon: Icon, title, paragraph, desc, highlight }, i) => (
                <motion.div
                  key={title}
                  variants={v.fadeUp}
                  custom={i}
                  className="p-5 sm:p-6 md:p-8 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(202,12,133,0.25)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                  }}
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                    >
                      <Icon size={18} style={{ color: "var(--brand)" }} />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-white mb-1"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(0.9rem, 3.5vw, 1.15rem)",
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                          lineHeight: 1.15,
                          wordBreak: "break-word",
                        }}
                      >
                        {title}
                      </h3>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5"
                        style={{
                          fontFamily: "var(--font-condensed)",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          color: "var(--brand)",
                          background: "rgba(202,12,133,0.1)",
                          border: "1px solid rgba(202,12,133,0.2)",
                        }}
                      >
                        <FileText size={9} /> {paragraph}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: "12px" }}>
                    {desc}
                  </p>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5"
                    style={{
                      background: "rgba(52,168,83,0.08)",
                      border: "1px solid rgba(52,168,83,0.2)",
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: "#34A853",
                    }}
                  >
                    <CheckCircle2 size={12} /> {highlight}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Tax Info Note */}
            <motion.div
              variants={v.fadeUp}
              initial="hidden"
              animate={taxInView ? "visible" : "hidden"}
              custom={5}
              className="mt-6 p-5 flex items-start gap-3"
              style={{
                background: "rgba(251,188,5,0.04)",
                border: "1px solid rgba(251,188,5,0.15)",
              }}
            >
              <BadgeCheck size={18} style={{ color: "#FBBC05", marginTop: "2px", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  <strong style={{ color: "rgba(255,255,255,0.7)" }}>Wichtig:</strong>{" "}
                  Die genannten Steuervorteile gelten für Maßnahmen, die den Anforderungen der
                  §§ 20 und 20b SGB V entsprechen (zertifizierte Präventionskurse, Gesundheitsförderung).
                  Unsere Kursangebote sind entsprechend konzipiert. Für die konkrete steuerliche Umsetzung
                  empfehlen wir die Rücksprache mit eurem Steuerberater.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            UNSERE ANGEBOTE FÜR FIRMEN
            ══════════════════════════════════════════════════════════════════════ */}
        <section ref={offeringsRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={offeringsInView ? "visible" : "hidden"}
              className="text-center mb-16"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Kurse &amp; Coaching</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                UNSERE <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>ANGEBOTE</span>{" "}
                FÜR FIRMEN
              </motion.h2>
              <motion.p
                variants={v.fadeUp}
                custom={2}
                className="max-w-2xl mx-auto"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}
              >
                Vom vergünstigten Zugang bis zum exklusiven Team-Event – wir schnüren
                euer individuelles Firmenpaket.
              </motion.p>
            </motion.div>

            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={offeringsInView ? "visible" : "hidden"}
              className="space-y-6"
            >
              {CORPORATE_OFFERINGS.map(({ icon: Icon, title, desc, features, image }, i) => {
                const isEven = i % 2 === 0;
                return (
                  <motion.div
                    key={title}
                    variants={v.fadeUp}
                    custom={i}
                    className="grid lg:grid-cols-2 gap-0 overflow-hidden transition-all duration-300"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(202,12,133,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    {/* Image */}
                    <div className={`relative overflow-hidden ${!isEven ? "lg:order-2" : ""}`}>
                      <ImageWithFallback
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                        style={{ minHeight: "200px", maxHeight: "400px" }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: isEven
                            ? "linear-gradient(to right, transparent 50%, rgba(5,5,5,0.8) 100%)"
                            : "linear-gradient(to left, transparent 50%, rgba(5,5,5,0.8) 100%)",
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className={`p-5 sm:p-8 md:p-10 flex flex-col justify-center ${!isEven ? "lg:order-1" : ""}`}>
                      <div
                        className="w-10 h-10 flex items-center justify-center mb-4"
                        style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}
                      >
                        <Icon size={18} style={{ color: "var(--brand)" }} />
                      </div>
                      <h3
                        className="text-white mb-3"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(1.15rem, 4vw, 1.5rem)",
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                          lineHeight: 1.1,
                        }}
                      >
                        {title}
                      </h3>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "20px" }}>
                        {desc}
                      </p>
                      <ul className="space-y-2">
                        {features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <CheckCircle2 size={14} style={{ color: "var(--brand)", marginTop: "3px", flexShrink: 0 }} />
                            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SO FUNKTIONIERT'S
            ══════════════════════════════════════════════════════════════════════ */}
        <section ref={processRef} className="relative" style={{ paddingTop: "64px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                animate={processInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.7 }}
                className="relative overflow-hidden order-2 lg:order-1"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <ImageWithFallback
                  src={IMG_PROCESS}
                  alt="Personal Training Coaching Session"
                  className="w-full aspect-[4/3] object-cover"
                />
              </motion.div>

              <motion.div
                variants={v.stagger}
                initial="hidden"
                animate={processInView ? "visible" : "hidden"}
                className="order-1 lg:order-2"
              >
                <motion.div variants={v.fadeUp} custom={0}>
                  <Label>So funktioniert's</Label>
                </motion.div>
                <motion.h2
                  variants={v.fadeUp}
                  custom={1}
                  className="text-white mb-10"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    lineHeight: 0.95,
                  }}
                >
                  IN 4 SCHRITTEN ZUM{" "}
                  <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>FIRMEN-FIT</span>
                </motion.h2>

                <div className="space-y-6">
                  {PROCESS.map(({ step, title, desc }, i) => (
                    <motion.div
                      key={step}
                      variants={v.fadeUp}
                      custom={i + 2}
                      className="flex gap-5 items-start"
                    >
                      <div
                        className="shrink-0 w-12 h-12 flex items-center justify-center"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.2rem",
                          letterSpacing: "0.04em",
                          color: "var(--brand)",
                          border: "1px solid rgba(202,12,133,0.3)",
                          background: "rgba(202,12,133,0.08)",
                        }}
                      >
                        {step}
                      </div>
                      <div>
                        <h3
                          className="text-white mb-1"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.1rem",
                            letterSpacing: "0.02em",
                            textTransform: "uppercase",
                          }}
                        >
                          {title}
                        </h3>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                          {desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            ROI / ZAHLEN & FAKTEN
            ══════════════════════════════════════════════════════════════════════ */}
        <section ref={roiRef} className="relative" style={{ paddingTop: "48px", paddingBottom: "64px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={roiInView ? "visible" : "hidden"}
              className="text-center mb-12"
            >
              <motion.div variants={v.fadeUp} custom={0}>
                <Label>Zahlen &amp; Fakten</Label>
              </motion.div>
              <motion.h2
                variants={v.fadeUp}
                custom={1}
                className="text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                DIE <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>RECHNUNG</span>{" "}
                GEHT AUF
              </motion.h2>
            </motion.div>

            <motion.div
              variants={v.stagger}
              initial="hidden"
              animate={roiInView ? "visible" : "hidden"}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {ROI_STATS.map(({ value, label, sub }, i) => (
                <motion.div
                  key={label}
                  variants={v.fadeUp}
                  custom={i}
                  className="p-4 sm:p-6 text-center transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span
                    className="block text-white mb-2"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2rem, 4vw, 3rem)",
                      letterSpacing: "0.02em",
                      lineHeight: 1,
                      color: "var(--brand)",
                    }}
                  >
                    {value}
                  </span>
                  <span
                    className="block mb-1"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: "white",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.3)",
                      lineHeight: 1.4,
                    }}
                  >
                    {sub}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Sources */}
            <motion.p
              variants={v.fadeUp}
              initial="hidden"
              animate={roiInView ? "visible" : "hidden"}
              custom={5}
              className="text-center mt-6"
              style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}
            >
              Quellen: iga.Report, Bundesgesundheitsministerium, DGUV, Techniker Krankenkasse
            </motion.p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            TRUST / REFERENZEN
            ══════════════════════════════════════════════════════════════════════ */}
        <section style={{ paddingTop: "32px", paddingBottom: "48px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div
              className="p-5 sm:p-8 text-center"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="mb-6"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase",
                }}
              >
                Diese Branchen vertrauen uns bereits
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {TRUST_ITEMS.map((item) => (
                  <span
                    key={item}
                    className="px-4 py-2"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.4)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            CTA
            ══════════════════════════════════════════════════════════════════════ */}
        <section ref={ctaRef} className="relative" style={{ paddingTop: "48px", paddingBottom: "96px" }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65 }}
              className="relative overflow-hidden p-6 sm:p-10 md:p-16 text-center"
              style={{
                background: "rgba(202,12,133,0.06)",
                border: "1px solid rgba(202,12,133,0.2)",
              }}
            >
              <div
                className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none"
                aria-hidden="true"
                style={{ background: "radial-gradient(circle, rgba(202,12,133,0.12), transparent 65%)" }}
              />
              <div
                className="absolute bottom-0 left-0 w-[250px] h-[250px] pointer-events-none"
                aria-hidden="true"
                style={{ background: "radial-gradient(circle, rgba(202,12,133,0.08), transparent 65%)" }}
              />

              <Building2 size={28} style={{ color: "var(--brand)", marginBottom: "16px" }} />
              <h2
                className="text-white mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 0.95,
                }}
              >
                JETZT <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>ANFRAGE</span>{" "}
                STELLEN
              </h2>
              <p
                className="max-w-xl mx-auto mb-4"
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}
              >
                Lass uns unverbindlich sprechen. Wir erstellen ein individuelles Angebot
                für dein Unternehmen – kostenlos, innerhalb von 48 Stunden.
              </p>

              {/* Contact details */}
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <a
                  href="mailto:info@nice-fitness.de?subject=Firmenfitness%20Anfrage"
                  className="inline-flex items-center gap-2 transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.5)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                >
                  <Mail size={14} /> info@nice-fitness.de
                </a>
                <a
                  href="tel:+4971619163663"
                  className="inline-flex items-center gap-2 transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.5)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                >
                  <Phone size={14} /> 07161 – 91 63 663
                </a>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/kontakt"
                  className="inline-flex items-center gap-2 text-white transition-all duration-200 active:scale-[0.98]"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "14px 32px",
                    background: "var(--brand)",
                    minHeight: "48px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 0 25px rgba(202,12,133,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Kostenloses Erstgespräch <ArrowRight size={14} />
                </Link>
                <a
                  href="tel:+4971619163663"
                  className="inline-flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "14px 28px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.7)",
                    minHeight: "48px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  }}
                >
                  <Phone size={14} /> Jetzt anrufen
                </a>
              </div>

              {/* FAQ-style quick answers */}
              <div className="grid sm:grid-cols-3 gap-4 mt-10 text-left">
                {[
                  { q: "Mindestanzahl Mitarbeiter?", a: "Ab 5 Personen erstellen wir ein Firmenangebot." },
                  { q: "Vertragslaufzeit?", a: "Flexible Laufzeiten, keine 24-Monats-Bindung." },
                  { q: "Abrechnung?", a: "Monatliche Sammelrechnung an euer Unternehmen." },
                ].map(({ q, a }) => (
                  <div
                    key={q}
                    className="p-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      className="mb-1"
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: "white",
                        textTransform: "uppercase",
                      }}
                    >
                      {q}
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                      {a}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </>
  );
}
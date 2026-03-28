import { useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowLeft, ArrowRight, ExternalLink,
  Building2, Phone, Mail, Scale, ShieldCheck,
  Link2, Copyright, Globe, Instagram, Facebook,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { PageHero, QuickNav, SectionCard } from "../components/ui/legal-page";
import { useReducedMotion } from "motion/react";
import { useSettings } from "../context/SettingsContext";

const NAV_ITEMS = [
  { id: "angaben",      label: "Angaben § 5 DDG",         icon: Building2   },
  { id: "kontakt",      label: "Kontakt",                 icon: Phone       },
  { id: "ustid",        label: "Umsatzsteuer-ID",         icon: Scale       },
  { id: "redaktion",    label: "Redaktionell Verantw.",    icon: ShieldCheck },
  { id: "social",       label: "Social Media",            icon: Instagram   },
  { id: "euos",         label: "EU-Streitschlichtung",    icon: Globe       },
  { id: "schlichtung",  label: "Verbraucherschlichtung",  icon: Scale       },
  { id: "haftung",      label: "Haftung für Inhalte",     icon: ShieldCheck },
  { id: "links",        label: "Haftung für Links",       icon: Link2       },
  { id: "urheber",      label: "Urheberrecht",            icon: Copyright   },
] as const;

export default function Impressum() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string>("angaben");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const { s } = useSettings();

  return (
    <>
      <PageMeta
        title="Impressum"
        description="Impressum der MK Fitness & Strength GmbH – Nice Athletic Club, Robert-Bosch-Straße 5, 73037 Göppingen. Angaben gemäß § 5 DDG."
        canonical="https://nicefitness.de/impressum"
        robots="noindex,nofollow"
      />

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <PageHero
          heroRef={heroRef}
          ghostText="IMPRESSUM"
          label="RECHTLICHE INFORMATIONEN"
          titleA="IMPRES"
          titleB="SUM"
          subtitle="Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz) · MK Fitness & Strength GmbH · Göppingen"
          badges={[
            { label: "ABSCHNITTE", val: "10" },
            { label: "DDG",        val: "§ 5" },
          ]}
          ghostY={ghostY}
          mobileTitle="Impressum"
          backSlot={
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/35 hover:text-brand transition-colors duration-200"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em" }}
            >
              <ArrowLeft size={13} />
              ZURÜCK
            </Link>
          }
        />

        <section className="pb-24 pt-10" style={{ backgroundColor: "var(--surface-0)" }}>
          <div className="relative max-w-7xl mx-auto px-6">
            <div className="flex gap-12">

              {/* Sidebar */}
              <aside className="hidden xl:block w-56 shrink-0">
                <div className="sticky top-24">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{ background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.06)", padding: "20px 0" }}
                  >
                    <QuickNav items={NAV_ITEMS as unknown as { id: string; label: string; icon: React.ElementType }[]} active={active} />
                  </motion.div>
                  <p className="mt-4 px-3 text-white/15" style={{ fontSize: "11px" }}>Stand: März 2026</p>
                </div>
              </aside>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-4">

                {/* Intro banner */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2 }}
                  className="flex items-start gap-4 p-5"
                  style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.18)" }}
                >
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.3)" }}>
                    <ShieldCheck size={14} style={{ color: "var(--brand)" }} />
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Das nachfolgende Impressum gilt für diese Website sowie für die folgenden
                    Social-Media-Präsenzen und ist gültig gemäß dem Digitale-Dienste-Gesetz (DDG), das seit
                    dem 14.05.2024 das Telemediengesetz (TMG) ersetzt hat.
                  </p>
                </motion.div>

                {/* 01 – Angaben § 5 DDG */}
                <SectionCard id="angaben" num="01" title="ANGABEN GEMÄSS § 5 DDG" icon={Building2} reduced={reduced} onView={setActive}>
                  <div className="p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <p className="text-white mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em" }}>
                        {s.company_name}
                      </p>
                      <p className="text-white/60 text-sm">(Nice Athletic Club)</p>
                      <p className="text-white/50 text-sm mt-1">
                        {s.company_street} · {s.company_zip} {s.company_city}
                      </p>
                    </div>
                    <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "RECHTSFORM",      val: "GmbH" },
                        { label: "HANDELSREGISTER", val: s.company_hrb },
                        { label: "REGISTERGERICHT", val: s.company_court },
                        { label: "GESCHÄFTSFÜHRER", val: s.ceo },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>{label}</p>
                          <p className="text-white/70 text-sm mt-0.5">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* 02 – Kontakt */}
                <SectionCard id="kontakt" num="02" title="KONTAKT" icon={Phone} reduced={reduced} onView={setActive}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {[
                      { icon: Phone, label: "TELEFON", val: s.phone, href: `tel:${s.phone.replace(/\s|\(0\)|\/|\(|\)/g, "")}` },
                      { icon: Mail,  label: "E-MAIL",  val: s.email,  href: `mailto:${s.email}` },
                    ].map(({ icon: Icon, label, val, href }) => (
                      <a key={label} href={href}
                        className="flex items-center gap-3 p-4 flex-1 group transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.3)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
                      >
                        <div className="w-8 h-8 flex items-center justify-center shrink-0"
                          style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}>
                          <Icon size={13} style={{ color: "var(--brand)" }} />
                        </div>
                        <div>
                          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>{label}</p>
                          <p className="text-white/70 text-sm group-hover:text-brand transition-colors">{val}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                  <p className="mt-2">
                    Website:{" "}
                    <a href={s.website} className="text-brand hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                      {s.website.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                </SectionCard>

                {/* 03 – Umsatzsteuer-ID */}
                <SectionCard id="ustid" num="03" title="UMSATZSTEUER-ID" icon={Scale} reduced={reduced} onView={setActive}>
                  <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:</p>
                  <div className="inline-flex items-center gap-3 px-5 py-3 mt-1"
                    style={{ background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.2)" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--brand)", letterSpacing: "0.06em" }}>{s.vat_id}</span>
                  </div>
                </SectionCard>

                {/* 04 – Redaktionell Verantwortlicher */}
                <SectionCard id="redaktion" num="04" title="REDAKTIONELL VERANTWORTLICHER" icon={ShieldCheck} reduced={reduced} onView={setActive}>
                  <p>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</p>
                  <div className="p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/80" style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em" }}>
                      {s.ceo}
                    </p>
                    <p>{s.company_name}</p>
                    <p>{s.company_street} · {s.company_zip} {s.company_city}</p>
                  </div>
                </SectionCard>

                {/* 05 – Social Media */}
                <SectionCard id="social" num="05" title="SOCIAL MEDIA PRÄSENZEN" icon={Instagram} reduced={reduced} onView={setActive}>
                  <p>
                    Dieses Impressum gilt auch für die folgenden Social-Media-Auftritte:
                  </p>
                  <div className="space-y-5">
                    <div>
                      <span className="flex items-center gap-2 mb-2"
                        style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)" }}>
                        <Instagram size={11} /> INSTAGRAM
                      </span>
                      <div className="space-y-1.5">
                        {[
                          "https://www.instagram.com/nice_athletic_club/",
                          "https://www.instagram.com/nice_fitnessandspa",
                          "https://www.instagram.com/crossfit_goeppingen/",
                        ].map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 transition-colors duration-200 hover:text-white group"
                            style={{ color: "var(--brand)", fontSize: "13px" }}>
                            <ExternalLink size={11} className="opacity-50 group-hover:opacity-100 shrink-0" />
                            <span className="truncate">{url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="flex items-center gap-2 mb-2"
                        style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)" }}>
                        <Facebook size={11} /> FACEBOOK
                      </span>
                      <a href="https://www.facebook.com/nice_athletic_club-113347320451242/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 transition-colors duration-200 hover:text-white group"
                        style={{ color: "var(--brand)", fontSize: "13px" }}>
                        <ExternalLink size={11} className="opacity-50 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">https://www.facebook.com/nice_athletic_club-113347320451242/</span>
                      </a>
                    </div>
                  </div>
                </SectionCard>

                {/* 06 – EU-Streitschlichtung */}
                <SectionCard id="euos" num="06" title="EU-STREITSCHLICHTUNG" icon={Globe} reduced={reduced} onView={setActive}>
                  <p>
                    Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                  </p>
                  <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-brand hover:text-white transition-colors">
                    <ExternalLink size={11} />
                    https://ec.europa.eu/consumers/odr
                  </a>
                  <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
                </SectionCard>

                {/* 07 – Verbraucherstreitbeilegung */}
                <SectionCard id="schlichtung" num="07" title="VERBRAUCHER­STREIT­BEILEGUNG / UNIVERSAL­SCHLICHTUNGS­STELLE" icon={Scale} reduced={reduced} onView={setActive}>
                  <p>
                    Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
                    Verbraucherschlichtungsstelle teilzunehmen.
                  </p>
                </SectionCard>

                {/* 08 – Haftung für Inhalte */}
                <SectionCard id="haftung" num="08" title="HAFTUNG FÜR INHALTE" icon={ShieldCheck} reduced={reduced} onView={setActive}>
                  <p>
                    Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
                    nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
                    Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
                    Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
                    Tätigkeit hinweisen.
                  </p>
                  <p>
                    Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
                    allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
                    erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
                    Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
                    entfernen.
                  </p>
                </SectionCard>

                {/* 09 – Haftung für Links */}
                <SectionCard id="links" num="09" title="HAFTUNG FÜR LINKS" icon={Link2} reduced={reduced} onView={setActive}>
                  <p>
                    Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
                    Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
                    übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
                    Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
                    Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
                    Zeitpunkt der Verlinkung nicht erkennbar.
                  </p>
                  <p>
                    Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
                    Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
                    Rechtsverletzungen werden wir derartige Links umgehend entfernen.
                  </p>
                </SectionCard>

                {/* 10 – Urheberrecht */}
                <SectionCard id="urheber" num="10" title="URHEBERRECHT" icon={Copyright} reduced={reduced} onView={setActive}>
                  <p>
                    Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
                    dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
                    der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
                    Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
                    sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
                  </p>
                  <p>
                    Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
                    Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
                    gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden,
                    bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
                    werden wir derartige Inhalte umgehend entfernen.
                  </p>
                </SectionCard>

                {/* Cross-Links */}
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <Link to="/datenschutz"
                    className="flex items-center gap-3 p-5 group transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.3)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.15)" }}>
                      <ShieldCheck size={16} style={{ color: "var(--brand)" }} />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm group-hover:text-brand transition-colors" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.05em" }}>
                        DATENSCHUTZERKLÄRUNG
                      </p>
                      <p className="text-white/40 text-xs">Informationen zur Datenverarbeitung gemäß DSGVO</p>
                    </div>
                    <ArrowRight size={14} className="ml-auto text-white/20 group-hover:text-brand transition-colors shrink-0" />
                  </Link>
                  <Link to="/agb"
                    className="flex items-center gap-3 p-5 group transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.3)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.15)" }}>
                      <Scale size={16} style={{ color: "var(--brand)" }} />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm group-hover:text-brand transition-colors" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.05em" }}>
                        ALLGEMEINE GESCHÄFTSBEDINGUNGEN
                      </p>
                      <p className="text-white/40 text-xs">Vertragsbedingungen für Mitglieder</p>
                    </div>
                    <ArrowRight size={14} className="ml-auto text-white/20 group-hover:text-brand transition-colors shrink-0" />
                  </Link>
                </div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 mt-4"
                  style={{ background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.22)" }}
                >
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at left center, rgba(202,12,133,0.12), transparent 65%)" }} />
                  <div className="relative">
                    <p className="text-white mb-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", letterSpacing: "0.04em" }}>
                      NOCH FRAGEN?
                    </p>
                    <p className="text-white/50 text-sm">Wir sind für dich da – direkt und ohne Umwege.</p>
                  </div>
                  <Link to="/kontakt"
                    className="group relative inline-flex items-center gap-3 px-7 py-4 text-white shrink-0 transition-all duration-300 active:scale-[0.98]"
                    style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(202,12,133,0.4)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    KONTAKT AUFNEHMEN
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>

                <p className="text-white/15 text-xs text-right pt-2">Stand: März 2026</p>
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </>
  );
}
import { useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowLeft, ArrowRight,
  UserCheck, Server, Cookie, ShieldCheck,
  Eye, Lock, AlertCircle, Mail, Globe, FileText,
  BarChart3, Type, MapPin, Settings,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { PageHero, QuickNav, SectionCard } from "../components/ui/legal-page";
import { useReducedMotion } from "motion/react";
import { openCookieSettings } from "../components/CookieBanner";
import { useSettings } from "../context/SettingsContext";

const NAV_ITEMS = [
  { id: "verantwortlicher", label: "Verantwortlicher",        icon: UserCheck   },
  { id: "hosting",          label: "Hosting & Checkdomain",   icon: Server      },
  { id: "log",              label: "Server-Log-Dateien",      icon: FileText    },
  { id: "ssl",              label: "SSL-Verschlüsselung",     icon: Lock        },
  { id: "cookies",          label: "Cookies & Consent",       icon: Cookie      },
  { id: "analytics",        label: "Google Analytics",        icon: BarChart3   },
  { id: "fonts",            label: "Google Fonts (lokal)",     icon: Type        },
  { id: "business",         label: "Google Business",         icon: MapPin      },
  { id: "kontaktform",      label: "Kontaktformular",         icon: Mail        },
  { id: "rechte",           label: "Ihre Rechte",             icon: Eye         },
  { id: "widerspruch",      label: "Widerspruchsrecht",       icon: AlertCircle },
  { id: "aufsicht",         label: "Aufsichtsbehörde",        icon: ShieldCheck },
  { id: "aenderungen",      label: "Änderungen",              icon: Globe       },
] as const;

export default function Datenschutz() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string>("verantwortlicher");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const { s } = useSettings();

  return (
    <>
      <PageMeta
        title="Datenschutz"
        description="Datenschutzerklärung der MK Fitness & Strength GmbH – Nice Athletic Club, Göppingen. Informationen gemäß DSGVO zu Cookies, Google Analytics, Hosting und Ihren Rechten."
        canonical="https://nicefitness.de/datenschutz"
        robots="noindex,nofollow"
      />

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <PageHero
          heroRef={heroRef}
          ghostText="DATENSCHUTZ"
          label="DSGVO · DATENSCHUTZERKLÄRUNG"
          titleA="DATEN"
          titleB="SCHUTZ"
          subtitle="Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO – MK Fitness & Strength GmbH"
          badges={[
            { label: "ABSCHNITTE", val: "13" },
            { label: "DSGVO",      val: "§ 13" },
          ]}
          ghostY={ghostY}
          mobileTitle="Datenschutz"
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
                    Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten
                    daher ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TDDDG).
                    In dieser Datenschutzerklärung informieren wir Sie über die wichtigsten Aspekte der
                    Datenverarbeitung auf unserer Website.
                  </p>
                </motion.div>

                {/* ── 01 – Verantwortlicher ── */}
                <SectionCard id="verantwortlicher" num="01" title="VERANTWORTLICHER" icon={UserCheck} reduced={reduced} onView={setActive}>
                  <p>Verantwortlicher im Sinne der Datenschutzgesetze, insbesondere der EU-Datenschutzgrundverordnung (DSGVO), ist:</p>
                  <div className="p-4 space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/80" style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.05em" }}>
                      {s.company_name}
                    </p>
                    <p>{s.company_street} · {s.company_zip} {s.company_city}</p>
                    <p>Telefon: <a href={`tel:${s.phone}`} className="text-brand hover:text-white transition-colors">{s.phone}</a></p>
                    <p>E-Mail: <a href={`mailto:${s.email}`} className="text-brand hover:text-white transition-colors">{s.email}</a></p>
                    <p>Website: <a href={s.website} className="text-brand hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">{s.website}</a></p>
                  </div>
                </SectionCard>

                {/* ── 02 – Hosting bei Checkdomain ── */}
                <SectionCard id="hosting" num="02" title="HOSTING BEI CHECKDOMAIN" icon={Server} reduced={reduced} onView={setActive}>
                  <p>
                    Diese Website wird bei der <strong className="text-white/80">checkdomain GmbH</strong> gehostet
                    (Große Burgstraße 27/29, 23552 Lübeck, Deutschland). Checkdomain betreibt die Server, auf denen
                    unsere Website gespeichert und abrufbar ist.
                  </p>
                  <div className="p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/50" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em" }}>HOSTING-DETAILS</p>
                    <ul className="space-y-1">
                      {[
                        "Serverstandort: Deutschland (EU)",
                        "Webserver: host271.checkdomain.de",
                        "Datenbank: MySQL 5.7 (checkdomain Shared Hosting)",
                        "PHP-Backend für API-Endpunkte",
                        "SSL/TLS-Verschlüsselung via Let's Encrypt",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    Beim Besuch unserer Website werden automatisch Informationen in sogenannten Server-Log-Dateien
                    gespeichert, die Ihr Browser an den Server übermittelt. Die Speicherung dieser Daten zusammen
                    mit anderen personenbezogenen Daten sowie die Weitergabe an Dritte findet nicht statt.
                  </p>
                  <p>
                    <strong className="text-white/70">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
                    (berechtigtes Interesse an einem sicheren und effizienten Betrieb der Website).
                  </p>
                  <p>
                    <strong className="text-white/70">Auftragsverarbeitung:</strong> Wir haben mit checkdomain einen
                    Vertrag zur Auftragsverarbeitung (AVV) abgeschlossen. Damit wird sichergestellt, dass die
                    personenbezogenen Daten unserer Websitebesucher nur nach unseren Weisungen und unter Einhaltung
                    der DSGVO verarbeitet werden.
                  </p>
                </SectionCard>

                {/* ── 03 – Server-Log-Dateien ── */}
                <SectionCard id="log" num="03" title="SERVER-LOG-DATEIEN" icon={FileText} reduced={reduced} onView={setActive}>
                  <p>
                    Der Hosting-Provider (checkdomain) erhebt und speichert automatisch Informationen in
                    sogenannten Server-Log-Dateien, die Ihr Browser automatisch übermittelt. Dies sind:
                  </p>
                  <ul className="space-y-1 pl-4">
                    {[
                      "Browsertyp und Browserversion",
                      "Verwendetes Betriebssystem",
                      "Referrer URL (die zuvor besuchte Seite)",
                      "Hostname des zugreifenden Rechners",
                      "Datum und Uhrzeit der Serveranfrage",
                      "IP-Adresse (wird nach spätestens 14 Tagen anonymisiert)",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Diese Daten werden insbesondere zu folgenden Zwecken verarbeitet: Sicherstellung eines
                    problemlosen Verbindungsaufbaus, Sicherstellung einer reibungslosen Nutzung, Auswertung
                    der Systemsicherheit und -stabilität sowie zur Optimierung unserer Website.
                  </p>
                  <p>
                    Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Wir
                    verwenden Ihre Daten nicht, um Rückschlüsse auf Ihre Person zu ziehen.
                  </p>
                  <p>
                    <strong className="text-white/70">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
                    (berechtigtes Interesse an der Sicherheit und Funktionalität der Website).
                  </p>
                  <p>
                    <strong className="text-white/70">Speicherdauer:</strong> Die Daten werden gelöscht, sobald
                    sie für den Zweck der Erhebung nicht mehr erforderlich sind. Im Falle der Log-Dateien ist
                    dies nach spätestens 14 Tagen der Fall. Eine darüber hinausgehende Speicherung ist möglich,
                    in diesem Fall werden die IP-Adressen anonymisiert.
                  </p>
                </SectionCard>

                {/* ── 04 – SSL/TLS ── */}
                <SectionCard id="ssl" num="04" title="SSL/TLS-VERSCHLÜSSELUNG" icon={Lock} reduced={reduced} onView={setActive}>
                  <p>
                    Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher
                    Inhalte – wie z. B. Anfragen über das Kontaktformular, Login-Daten oder Mitglieder-Daten –
                    eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass
                    die Adresszeile des Browsers von „http://" auf „<strong className="text-white/80">https://</strong>" wechselt und an dem
                    Schloss-Symbol in Ihrer Browserzeile.
                  </p>
                  <p>
                    Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns
                    übermitteln, nicht von Dritten mitgelesen werden.
                  </p>
                  <div className="p-3" style={{ background: "rgba(52,168,83,0.06)", border: "1px solid rgba(52,168,83,0.15)" }}>
                    <p className="text-xs" style={{ color: "rgba(52,168,83,0.9)" }}>
                      ✓ Diese Website ist mit einem SSL-Zertifikat via Let's Encrypt über den Hosting-Provider
                      checkdomain gesichert. Alle Datenübertragungen erfolgen verschlüsselt.
                    </p>
                  </div>
                </SectionCard>

                {/* ── 05 – Cookies & Cookie-Banner ── */}
                <SectionCard id="cookies" num="05" title="COOKIES & EINWILLIGUNG" icon={Cookie} reduced={reduced} onView={setActive}>
                  <p>
                    Unsere Website verwendet Cookies. Dabei handelt es sich um kleine Textdateien, die auf
                    Ihrem Endgerät gespeichert werden und die eine Analyse der Nutzung der Website ermöglichen.
                  </p>

                  <div className="grid sm:grid-cols-3 gap-3 mt-2">
                    {[
                      {
                        type: "TECHNISCH NOTWENDIG",
                        desc: "Für den Betrieb der Website unerlässlich (z. B. Session-Management, Login-Token, Cookie-Consent-Status). Kein Opt-out möglich.",
                        examples: "nice_cookie_consent, jwt_token",
                      },
                      {
                        type: "ANALYSE / STATISTIK",
                        desc: "Google Analytics Cookies zur Nutzungsanalyse. Werden nur nach Ihrer ausdrücklichen Einwilligung gesetzt.",
                        examples: "_ga, _ga_*, _gid",
                      },
                      {
                        type: "MARKETING",
                        desc: "Für personalisierte Werbung und Remarketing (z. B. Google Ads). Derzeit nicht aktiv, aber für zukünftige Nutzung vorgesehen.",
                        examples: "Derzeit keine",
                      },
                    ].map(({ type, desc, examples }) => (
                      <div key={type} className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-white/50 mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em" }}>{type}</p>
                        <p className="text-xs text-white/50 mb-2">{desc}</p>
                        <p className="text-xs text-white/30"><em>Cookies: {examples}</em></p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 mt-2" style={{ background: "rgba(202,12,133,0.04)", border: "1px solid rgba(202,12,133,0.15)" }}>
                    <p className="text-white/60 text-sm mb-3">
                      <strong className="text-white/80">Cookie-Banner / Einwilligungsmanagement:</strong>{" "}
                      Beim ersten Besuch unserer Website werden Sie über ein Cookie-Banner über die Verwendung
                      von Cookies informiert und um Ihre Einwilligung gebeten. Sie können Ihre Einstellungen
                      jederzeit anpassen:
                    </p>
                    <button
                      onClick={openCookieSettings}
                      className="inline-flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        padding: "10px 20px",
                        background: "rgba(202,12,133,0.12)",
                        border: "1px solid rgba(202,12,133,0.3)",
                        color: "var(--brand)",
                        cursor: "pointer",
                        minHeight: "44px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(202,12,133,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(202,12,133,0.12)";
                      }}
                    >
                      <Settings size={13} />
                      Cookie-Einstellungen öffnen
                    </button>
                  </div>

                  <p>
                    <strong className="text-white/70">Rechtsgrundlage:</strong> Technisch notwendige Cookies
                    werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gesetzt. Analyse- und Marketing-Cookies
                    werden nur auf Grundlage Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO gesetzt.
                  </p>
                  <p>
                    Sie können die Speicherung von Cookies auch über Ihre Browsereinstellungen verhindern. Bereits
                    gespeicherte Cookies können jederzeit gelöscht werden. Bitte beachten Sie, dass ohne Cookies
                    die Funktionalität unserer Website eingeschränkt sein kann.
                  </p>
                </SectionCard>

                {/* ── 06 – Google Analytics ── */}
                <SectionCard id="analytics" num="06" title="GOOGLE ANALYTICS" icon={BarChart3} reduced={reduced} onView={setActive}>
                  <p>
                    Diese Website nutzt <strong className="text-white/80">Google Analytics 4 (GA4)</strong>, einen
                    Webanalysedienst der Google Ireland Limited („Google"), Gordon House, Barrow Street, Dublin 4,
                    Irland. Google Analytics verwendet Cookies, die eine Analyse der Benutzung der Website durch
                    Sie ermöglichen.
                  </p>

                  <div className="p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/50" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em" }}>WAS WIRD ERFASST?</p>
                    <ul className="space-y-1">
                      {[
                        "Seitenaufrufe und Verweildauer",
                        "Gerätetyp, Betriebssystem und Browser",
                        "Ungefährer Standort (auf Stadtebene)",
                        "Verweisquelle (Referrer)",
                        "Interaktionen auf der Website (Klicks, Scrolltiefe)",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p>
                    <strong className="text-white/70">IP-Anonymisierung:</strong> Google Analytics 4 anonymisiert
                    IP-Adressen standardmäßig. Ihre vollständige IP-Adresse wird von Google nicht gespeichert.
                  </p>
                  <p>
                    <strong className="text-white/70">Einwilligung erforderlich:</strong> Google Analytics wird
                    nur aktiviert, wenn Sie im Cookie-Banner unter „Analyse & Statistik" zugestimmt haben.
                    Ohne Ihre Einwilligung werden keine Analyse-Cookies gesetzt und keine Daten an Google übermittelt.
                  </p>
                  <p>
                    <strong className="text-white/70">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO
                    (Einwilligung). Die Einwilligung kann jederzeit über unseren Cookie-Banner widerrufen werden.
                  </p>
                  <p>
                    <strong className="text-white/70">Datenübermittlung in die USA:</strong> Google kann Daten
                    in die USA übermitteln. Google nimmt am EU-US Data Privacy Framework teil. Weitere Informationen
                    finden Sie in den{" "}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-white transition-colors">
                      Datenschutzbestimmungen von Google
                    </a>.
                  </p>
                  <p>
                    <strong className="text-white/70">Opt-out:</strong> Sie können die Erfassung durch Google
                    Analytics verhindern, indem Sie Ihre Einwilligung im Cookie-Banner widerrufen oder das{" "}
                    <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-white transition-colors">
                      Browser-Add-on zur Deaktivierung von Google Analytics
                    </a>{" "}
                    installieren.
                  </p>
                </SectionCard>

                {/* ── 07 – Google Fonts ── */}
                <SectionCard id="fonts" num="07" title="GOOGLE FONTS (LOKAL)" icon={Type} reduced={reduced} onView={setActive}>
                  <p>
                    Diese Website verwendet <strong className="text-white/80">Google Fonts</strong> zur einheitlichen
                    Darstellung von Schriftarten. Die Schriftarten sind <strong className="text-white/80">lokal auf
                    unserem Server gehostet</strong> (Self-Hosting via @fontsource). Es findet <strong className="text-white/80">keine
                    Verbindung zu Google-Servern</strong> statt. Ihre IP-Adresse wird nicht an Google übermittelt.
                  </p>
                  <div className="p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/50" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em" }}>VERWENDETE SCHRIFTARTEN (LOKAL GEHOSTET)</p>
                    <ul className="space-y-1">
                      {[
                        "Bebas Neue (Headings & Display)",
                        "Barlow Condensed (Labels & UI-Elemente)",
                        "Poppins (Fließtext)",
                        "Inter (Alternative Fließtext)",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3" style={{ background: "rgba(52,168,83,0.06)", border: "1px solid rgba(52,168,83,0.15)" }}>
                    <p className="text-xs" style={{ color: "rgba(52,168,83,0.9)" }}>
                      ✓ Durch das lokale Hosting der Schriftarten werden keine personenbezogenen Daten an
                      Google oder andere Drittanbieter übermittelt. Dies entspricht den Anforderungen der DSGVO.
                    </p>
                  </div>
                </SectionCard>

                {/* ── 08 – Google Business Profile ── */}
                <SectionCard id="business" num="08" title="GOOGLE BUSINESS PROFILE" icon={MapPin} reduced={reduced} onView={setActive}>
                  <p>
                    Wir nutzen <strong className="text-white/80">Google Business Profile</strong> (ehemals Google
                    My Business), um unser Unternehmen in der Google-Suche und auf Google Maps darzustellen.
                    Dieser Dienst wird von der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
                    Irland, bereitgestellt.
                  </p>
                  <p>
                    Über unser Google Business Profile werden folgende Informationen öffentlich angezeigt:
                  </p>
                  <ul className="space-y-1 pl-4">
                    {[
                      "Firmenname, Adresse und Kontaktdaten",
                      "Öffnungszeiten",
                      "Fotos des Studios und der Einrichtung",
                      "Bewertungen und Rezensionen von Nutzern",
                      "Standort auf Google Maps",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Wenn Sie unser Google Business Profile besuchen oder eine Rezension hinterlassen, gelten
                    die{" "}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-white transition-colors">
                      Datenschutzbestimmungen von Google
                    </a>.
                    Google kann dabei Nutzungsdaten erheben und verarbeiten.
                  </p>
                  <p>
                    <strong className="text-white/70">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
                    (berechtigtes Interesse an einer Sichtbarkeit in Suchmaschinen und der Interaktion mit Kunden).
                  </p>
                </SectionCard>

                {/* ── 09 – Kontaktformular ── */}
                <SectionCard id="kontaktform" num="09" title="KONTAKTFORMULAR & E-MAIL-KONTAKT" icon={Mail} reduced={reduced} onView={setActive}>
                  <p>
                    Wenn Sie uns per Kontaktformular oder E-Mail Anfragen zukommen lassen, werden Ihre Angaben
                    aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten (z. B. Name,
                    E-Mail-Adresse, Telefonnummer, Betreff der Anfrage) zwecks Bearbeitung der Anfrage und für
                    den Fall von Anschlussfragen bei uns gespeichert.
                  </p>
                  <p>
                    Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Die Verarbeitung erfolgt auf
                    Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung) bzw. Art. 6 Abs. 1 lit. f
                    DSGVO (berechtigtes Interesse an der Beantwortung Ihrer Anfrage).
                  </p>
                  <p>
                    Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur
                    Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die
                    Datenspeicherung entfällt. Zwingende gesetzliche Bestimmungen – insbesondere
                    Aufbewahrungsfristen – bleiben unberührt.
                  </p>
                  <p>
                    <strong className="text-white/70">E-Mail-Versand:</strong> Kontaktanfragen werden über
                    unseren E-Mail-Server (checkdomain, Serverstandort Deutschland) verarbeitet. Der
                    E-Mail-Versand erfolgt über eine verschlüsselte SMTP-Verbindung (SSL/TLS, Port 465).
                  </p>
                </SectionCard>

                {/* ── 10 – Ihre Rechte ── */}
                <SectionCard id="rechte" num="10" title="IHRE RECHTE ALS BETROFFENER" icon={Eye} reduced={reduced} onView={setActive}>
                  <p>Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:</p>
                  <div className="grid sm:grid-cols-2 gap-2 mt-1">
                    {[
                      { r: "Auskunftsrecht",                     art: "Art. 15 DSGVO" },
                      { r: "Recht auf Berichtigung",             art: "Art. 16 DSGVO" },
                      { r: "Recht auf Löschung",                  art: "Art. 17 DSGVO" },
                      { r: "Einschränkung der Verarbeitung",     art: "Art. 18 DSGVO" },
                      { r: "Datenübertragbarkeit",               art: "Art. 20 DSGVO" },
                      { r: "Widerspruchsrecht",                  art: "Art. 21 DSGVO" },
                      { r: "Widerruf der Einwilligung",          art: "Art. 7 Abs. 3 DSGVO" },
                      { r: "Beschwerderecht bei Aufsichtsbehörde", art: "Art. 77 DSGVO" },
                    ].map(({ r, art }) => (
                      <div key={r} className="flex items-center justify-between p-2.5"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span className="text-white/70 text-xs">{r}</span>
                        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--brand)" }}>{art}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2">
                    Sofern Sie uns eine Einwilligung erteilt haben, können Sie diese jederzeit mit Wirkung
                    für die Zukunft widerrufen (z. B. über den Cookie-Banner oder per E-Mail).
                  </p>
                  <p>
                    Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
                    <a href={`mailto:${s.email}`} className="text-brand hover:text-white transition-colors">{s.email}</a>
                  </p>
                </SectionCard>

                {/* ── 11 – Widerspruchsrecht ── */}
                <SectionCard id="widerspruch" num="11" title="WIDERSPRUCHSRECHT (ART. 21 DSGVO)" icon={AlertCircle} reduced={reduced} onView={setActive}>
                  <div className="p-4" style={{ background: "rgba(251,188,5,0.04)", border: "1px solid rgba(251,188,5,0.15)" }}>
                    <p className="text-white/70 text-sm" style={{ lineHeight: 1.7 }}>
                      <strong className="text-white/90">Einzelfallbezogenes Widerspruchsrecht:</strong>{" "}
                      Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit
                      gegen die Verarbeitung Sie betreffender personenbezogener Daten, die aufgrund Art. 6 Abs. 1
                      lit. f DSGVO (Datenverarbeitung auf Grundlage einer Interessenabwägung) erfolgt, Widerspruch
                      einzulegen; dies gilt auch für ein auf diese Bestimmung gestütztes Profiling im Sinne von
                      Art. 4 Nr. 4 DSGVO.
                    </p>
                  </div>
                  <p>
                    Legen Sie Widerspruch ein, werden wir Ihre personenbezogenen Daten nicht mehr verarbeiten,
                    es sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die
                    Ihre Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient der
                    Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.
                  </p>
                  <p>
                    Möchten Sie von Ihrem Widerspruchsrecht Gebrauch machen, genügt eine E-Mail an:
                  </p>
                  <div className="p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/80" style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em" }}>
                      MK Fitness &amp; Strength GmbH
                    </p>
                    <p><a href="mailto:info@nice-fitness.de" className="text-brand hover:text-white transition-colors">info@nice-fitness.de</a></p>
                    <p>Robert-Bosch-Str. 5 · 73037 Göppingen</p>
                  </div>
                </SectionCard>

                {/* ── 12 – Aufsichtsbehörde ── */}
                <SectionCard id="aufsicht" num="12" title="AUFSICHTSBEHÖRDE" icon={ShieldCheck} reduced={reduced} onView={setActive}>
                  <p>
                    Sie haben das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO).
                    Die für Baden-Württemberg zuständige Aufsichtsbehörde ist:
                  </p>
                  <div className="p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/80" style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em" }}>
                      Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg
                    </p>
                    <p className="mt-1">Lautenschlagerstraße 20 · 70173 Stuttgart</p>
                    <p className="mt-1">
                      Telefon: <a href="tel:+49711615541-0" className="text-brand hover:text-white transition-colors">+49 (0) 711 / 615541-0</a>
                    </p>
                    <a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-brand hover:text-white transition-colors text-xs">
                      www.baden-wuerttemberg.datenschutz.de
                    </a>
                  </div>
                  <p>
                    Eine Liste der Aufsichtsbehörden (für den nichtöffentlichen Bereich) mit Anschrift finden
                    Sie unter:{" "}
                    <a href="https://www.bfdi.bund.de/DE/Service/Anschriften/Laender/Laender-node.html" target="_blank" rel="noopener noreferrer"
                      className="text-brand hover:text-white transition-colors break-all">
                      bfdi.bund.de/DE/Service/Anschriften
                    </a>.
                  </p>
                </SectionCard>

                {/* ── 13 – Änderungen ── */}
                <SectionCard id="aenderungen" num="13" title="ÄNDERUNGEN DIESER ERKLÄRUNG" icon={Globe} reduced={reduced} onView={setActive}>
                  <p>
                    Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen
                    rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der
                    Datenschutzerklärung umzusetzen, z. B. bei der Einführung neuer Services oder Dienste.
                  </p>
                  <p>
                    Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung. Diese Erklärung wurde
                    zuletzt im <strong className="text-white/80">März 2026</strong> aktualisiert.
                  </p>
                </SectionCard>

                {/* ── CTA ── */}
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 mt-8"
                  style={{ background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.22)" }}
                >
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at left center, rgba(202,12,133,0.12), transparent 65%)" }} />
                  <div className="relative">
                    <p className="text-white mb-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", letterSpacing: "0.04em" }}>
                      FRAGEN ZUM DATENSCHUTZ?
                    </p>
                    <p className="text-white/50 text-sm">Wir antworten innerhalb von 24 Stunden.</p>
                  </div>
                  <Link
                    to="/kontakt"
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
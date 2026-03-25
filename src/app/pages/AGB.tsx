import { useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import {
  ArrowLeft, ArrowRight,
  FileText, Users, CreditCard, CalendarX2, Clock,
  Dumbbell, ShieldAlert, Scale, RefreshCw, Gavel,
  CheckCircle2, Heart, Pause, Building2, ShieldCheck,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { PageHero, QuickNav, SectionCard } from "../components/ui/legal-page";
import { useSettings } from "../context/SettingsContext";

const NAV_ITEMS = [
  { id: "geltung",        label: "Geltungsbereich",        icon: FileText     },
  { id: "mitgliedschaft", label: "Mitgliedschaft",          icon: Users        },
  { id: "tarife",         label: "Tarife & Leistungen",     icon: Dumbbell     },
  { id: "beitraege",      label: "Beiträge & Zahlung",      icon: CreditCard   },
  { id: "laufzeit",       label: "Laufzeit & Kündigung",    icon: CalendarX2   },
  { id: "ruhezeit",       label: "Ruhezeit / Pausierung",   icon: Pause        },
  { id: "oeffnung",       label: "Öffnungszeiten & Zugang", icon: Clock        },
  { id: "probe",          label: "Probetraining",           icon: Heart        },
  { id: "firmenfitness",  label: "Firmenfitness",           icon: Building2    },
  { id: "hausordnung",    label: "Hausordnung",             icon: CheckCircle2 },
  { id: "haftung",        label: "Haftung & Versicherung",  icon: ShieldAlert  },
  { id: "datenschutz",    label: "Datenschutz",             icon: ShieldCheck  },
  { id: "aenderungen",    label: "Änderungen der AGB",      icon: RefreshCw    },
  { id: "schluss",        label: "Schlussbestimmungen",      icon: Gavel        },
] as const;

export default function AGB() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string>("geltung");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const { s } = useSettings();

  return (
    <>
      <PageMeta
        title="AGB"
        description="Allgemeine Geschäftsbedingungen der MK Fitness & Strength GmbH – Nice Athletic Club, Göppingen. Tarife, Laufzeiten, Hausordnung und mehr."
        canonical="https://niceathleticclub.de/agb"
      />

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <PageHero
          heroRef={heroRef}
          ghostText="AGB"
          label="ALLGEMEINE GESCHÄFTSBEDINGUNGEN"
          titleA="A"
          titleB="GB"
          subtitle="Allgemeine Geschäftsbedingungen der MK Fitness & Strength GmbH für den Nice Athletic Club, Göppingen"
          badges={[
            { label: "ABSCHNITTE", val: "14"  },
            { label: "STAND",      val: "'26" },
          ]}
          ghostY={ghostY}
          mobileTitle="AGB"
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

                {/* Intro */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2 }}
                  className="flex items-start gap-4 p-5"
                  style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.18)" }}
                >
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.3)" }}>
                    <FileText size={14} style={{ color: "var(--brand)" }} />
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Diese Allgemeinen Geschäftsbedingungen regeln das Vertragsverhältnis zwischen der
                    {s.company_name} und ihren Mitgliedern. Mit Abschluss des Mitgliedsvertrags
                    werden diese AGB Vertragsbestandteil. Unsere Tarife haben <strong className="text-white/80">keine Mindestlaufzeit</strong> und
                    sind <strong className="text-white/80">monatlich kündbar</strong>.
                  </p>
                </motion.div>

                {/* ── 01 – Geltungsbereich ── */}
                <SectionCard id="geltung" num="01" title="GELTUNGSBEREICH" icon={FileText} reduced={reduced} onView={setActive}>
                  <p>
                    Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen der
                    {s.company_name}, {s.company_street}, {s.company_zip} {s.company_city} (nachfolgend
                    „Nice Athletic Club", „NAC" oder „Betreiber") und deren Mitgliedern (nachfolgend „Mitglied").
                  </p>
                  <p>
                    Abweichende Bedingungen des Mitglieds erkennen wir nicht an, es sei denn, wir hätten
                    ihrer Geltung ausdrücklich schriftlich zugestimmt. Diese AGB gelten auch dann, wenn wir
                    in Kenntnis entgegenstehender oder abweichender Bedingungen des Mitglieds die Leistungen
                    vorbehaltlos erbringen.
                  </p>
                  <p>
                    Die AGB gelten für alle angebotenen Dienstleistungen, einschließlich Fitnesstraining,
                    CrossFit, HYROX-Training, Kursangebote, Personal Training, Firmenfitness und
                    Zusatzleistungen (Add-ons).
                  </p>
                </SectionCard>

                {/* ── 02 – Mitgliedschaft ── */}
                <SectionCard id="mitgliedschaft" num="02" title="MITGLIEDSCHAFT & VERTRAGSSCHLUSS" icon={Users} reduced={reduced} onView={setActive}>
                  <p>
                    Der Mitgliedsvertrag kommt durch die schriftliche oder digitale Anmeldung des Mitglieds
                    und die Annahme durch den NAC zustande. Die Annahme kann auch durch Ausstellung der
                    Mitgliedskarte, Freischaltung des digitalen Zugangs oder Gewährung des Zugangs zu den
                    Einrichtungen erfolgen.
                  </p>
                  <p>
                    Der Abschluss eines Mitgliedsvertrags ist Personen ab 18 Jahren möglich. Minderjährige
                    ab 16 Jahren können mit schriftlicher Einwilligung eines Erziehungsberechtigten Mitglied
                    werden. Der Erziehungsberechtigte haftet gesamtschuldnerisch für alle Verpflichtungen
                    aus dem Vertrag.
                  </p>
                  <p>
                    Die Mitgliedschaft ist persönlich und nicht übertragbar. Jede Mitgliedschaft gilt für
                    eine Person und schließt die Nutzung der Einrichtungen und Angebote des NAC gemäß dem
                    gewählten Tarif ein.
                  </p>
                  <p>
                    <strong className="text-white/70">Widerrufsrecht:</strong> Wird der Vertrag außerhalb der Geschäftsräume
                    oder online abgeschlossen, hat das Mitglied ein gesetzliches Widerrufsrecht von 14 Tagen
                    ab Vertragsschluss (§ 312g BGB). Der Widerruf bedarf der Textform (E-Mail genügt). Hat
                    das Mitglied die Leistung vor Ablauf der Widerrufsfrist in Anspruch genommen, ist der
                    anteilige Betrag zu entrichten.
                  </p>
                </SectionCard>

                {/* ── 03 – Tarife & Leistungen ── */}
                <SectionCard id="tarife" num="03" title="TARIFE & LEISTUNGEN" icon={Dumbbell} reduced={reduced} onView={setActive}>
                  <p>
                    Der NAC bietet verschiedene Mitgliedschaftstarife an, deren Umfang sich nach der jeweiligen
                    aktuellen Preisliste richtet. Folgende Tarife stehen zur Verfügung:
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 mt-2">
                    {[
                      {
                        name: "ATHLETIC WEEKEND",
                        desc: "Zugang zur Athletic Area an Samstagen, Sonntagen und Feiertagen. Idealer Einstieg für Wochenend-Sportler.",
                      },
                      {
                        name: "ATHLETIC",
                        desc: "Vollzugang zur Athletic Area an allen Öffnungstagen inkl. freien Gewichten, Gerätepark, Cardio-Bereich und Functional Training Zone.",
                      },
                      {
                        name: "ATHLETIC + UNLIMITED",
                        desc: "Athletic-Zugang plus unlimitierte Teilnahme an allen Gruppenkursen (z. B. Functional Training, HIIT, Mobility).",
                      },
                      {
                        name: "NICEST",
                        desc: "All-Inclusive-Tarif: Voller Athletic-Zugang, alle Kurse, CrossFit-Klassen, HYROX-Training und Premiumleistungen.",
                      },
                    ].map(({ name, desc }) => (
                      <div key={name} className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-white/50 mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em" }}>{name}</p>
                        <p className="text-xs text-white/50">{desc}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2">
                    <strong className="text-white/70">Add-ons:</strong> Zusätzlich zum gewählten Grundtarif können
                    folgende Zusatzleistungen hinzugebucht werden: CrossFit-Klassen (einzeln oder unlimited),
                    HYROX-spezifisches Training, Personal Training und weitere Spezialangebote. Add-ons werden
                    auf den Grundpreis aufgerechnet.
                  </p>
                  <p>
                    <strong className="text-white/70">Blaulicht-Rabatt:</strong> Angehörige von Blaulicht-Organisationen
                    (Feuerwehr, Polizei, Rettungsdienst, THW) erhalten einen Rabatt auf ausgewählte Tarife.
                    Ein gültiger Dienstausweis ist bei der Anmeldung vorzulegen.
                  </p>
                  <p>
                    Der aktuelle Umfang der Leistungen, Preise und verfügbare Add-ons sind auf der Website
                    unter{" "}
                    <Link to="/preise" className="text-brand hover:text-white transition-colors">niceathleticclub.de/preise</Link>{" "}
                    und im Studio einsehbar.
                  </p>
                </SectionCard>

                {/* ── 04 – Beiträge & Zahlung ── */}
                <SectionCard id="beitraege" num="04" title="BEITRÄGE & ZAHLUNGSBEDINGUNGEN" icon={CreditCard} reduced={reduced} onView={setActive}>
                  <p>
                    Die monatlichen Mitgliedsbeiträge ergeben sich aus der jeweils aktuellen Preisliste
                    und dem gewählten Tarif. Alle Preise verstehen sich inklusive der gesetzlichen
                    Mehrwertsteuer.
                  </p>
                  <p>
                    <strong className="text-white/70">Fälligkeit:</strong> Die Beiträge werden monatlich im
                    Voraus zum 1. eines jeden Monats fällig.
                  </p>
                  <p>
                    <strong className="text-white/70">Zahlungsmethoden:</strong> Die Zahlung erfolgt per
                    SEPA-Lastschriftmandat. Das Mitglied erteilt dem NAC bei Vertragsschluss ein
                    SEPA-Lastschriftmandat. Die Vorabinformation (Pre-Notification) über den Einzug erfolgt
                    mindestens 5 Tage vor dem Einzugstermin.
                  </p>
                  <p>
                    <strong className="text-white/70">Rücklastschriften:</strong> Bei Rücklastschriften, die
                    das Mitglied zu vertreten hat (z. B. mangelnde Kontodeckung, Widerspruch ohne Rechtsgrund),
                    werden die dadurch entstehenden Bankgebühren (derzeit ca. 5–10 €) dem Mitglied in Rechnung
                    gestellt.
                  </p>
                  <p>
                    <strong className="text-white/70">Zahlungsverzug:</strong> Gerät das Mitglied mit der
                    Zahlung in Verzug, ist der NAC berechtigt, das Zutrittsrecht bis zur vollständigen
                    Begleichung aller offenen Forderungen auszusetzen. Die Beitragspflicht besteht während
                    der Sperrung fort.
                  </p>
                  <p>
                    <strong className="text-white/70">Keine Aufnahmegebühr:</strong> Es wird keine
                    Aufnahme- oder Verwaltungsgebühr erhoben. Es fallen ausschließlich die monatlichen
                    Beiträge gemäß gewähltem Tarif an.
                  </p>

                  <div className="p-3 mt-1" style={{ background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.18)" }}>
                    <p className="text-white/70 text-xs">
                      <span style={{ color: "var(--brand)", fontWeight: 600 }}>Hinweis:</span> Preisanpassungen
                      werden dem Mitglied mindestens 6 Wochen im Voraus in Textform (E-Mail oder Brief)
                      mitgeteilt. Das Mitglied hat in diesem Fall ein Sonderkündigungsrecht zum Zeitpunkt
                      des Inkrafttretens der Preisänderung.
                    </p>
                  </div>
                </SectionCard>

                {/* ── 05 – Laufzeit & Kündigung ── */}
                <SectionCard id="laufzeit" num="05" title="LAUFZEIT & KÜNDIGUNG" icon={CalendarX2} reduced={reduced} onView={setActive}>
                  <p>
                    Alle Mitgliedschaftstarife des NAC werden <strong className="text-white/80">ohne
                    Mindestlaufzeit</strong> abgeschlossen. Der Vertrag läuft auf unbestimmte Zeit und ist
                    jederzeit zum Monatsende kündbar.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 mt-2">
                    {[
                      { label: "MINDESTLAUFZEIT", val: "Keine" },
                      { label: "KÜNDIGUNGSFRIST", val: "Zum Monatsende (jederzeit)" },
                      { label: "FORM DER KÜNDIGUNG", val: "Textform: E-Mail, Brief oder Mitgliederportal" },
                      { label: "BESTÄTIGUNG", val: "Schriftliche Kündigungsbestätigung" },
                    ].map(({ label, val }) => (
                      <div key={label} className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)" }}>{label}</p>
                        <p className="text-white/70 text-xs mt-1">{val}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2">
                    Die Kündigung bedarf der Textform (E-Mail an{" "}
                    <a href={`mailto:${s.email || "info@nice-fitness.de"}`} className="text-brand hover:text-white transition-colors">{s.email || "info@nice-fitness.de"}</a>,
                    Brief oder über das Mitgliederportal). Mündliche Kündigungen werden nicht akzeptiert.
                    Der NAC bestätigt jede Kündigung schriftlich.
                  </p>
                  <p>
                    <strong className="text-white/70">Außerordentliche Kündigung:</strong> Das Recht zur
                    außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund
                    liegt insbesondere vor bei:
                  </p>
                  <ul className="space-y-1 pl-4">
                    {[
                      "Dauerhafter medizinisch attestierter Trainingsunfähigkeit (ärztliches Attest erforderlich)",
                      "Wohnsitzwechsel von mehr als 30 km Entfernung zum Studio",
                      "Schwangerschaft (mit ärztlichem Nachweis)",
                      "Schwerwiegender Vertragsverletzung durch den NAC",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ background: "var(--brand)" }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                {/* ── 06 – Ruhezeit / Pausierung ── */}
                <SectionCard id="ruhezeit" num="06" title="RUHEZEIT / PAUSIERUNG" icon={Pause} reduced={reduced} onView={setActive}>
                  <p>
                    Eine Ruhepause der Mitgliedschaft ist auf Antrag möglich, z. B. bei längerer Krankheit,
                    Schwangerschaft oder beruflich bedingtem Auslandsaufenthalt. Während der Ruhezeit wird
                    kein Beitrag erhoben.
                  </p>
                  <p>
                    <strong className="text-white/70">Bedingungen:</strong> Die Ruhezeit muss schriftlich
                    beantragt und vom NAC genehmigt werden. Es gelten folgende Regelungen:
                  </p>
                  <ul className="space-y-1 pl-4">
                    {[
                      "Minimale Pausierungsdauer: 1 Monat",
                      "Maximale Pausierungsdauer: 3 Monate pro Kalenderjahr",
                      "Während der Ruhezeit ist kein Zutritt zum Studio möglich",
                      "Ein entsprechender Nachweis (ärztliches Attest, Arbeitgeberbescheinigung) kann verlangt werden",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ background: "var(--brand)" }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                {/* ── 07 – Öffnungszeiten & Zugang ── */}
                <SectionCard id="oeffnung" num="07" title="ÖFFNUNGSZEITEN & ZUGANG" icon={Clock} reduced={reduced} onView={setActive}>
                  <p>
                    Das Studio ist <strong className="text-white/80">täglich von 05:00 bis 00:00 Uhr</strong> geöffnet,
                    einschließlich Samstagen, Sonntagen und Feiertagen. Der NAC behält sich vor, die
                    Öffnungszeiten bei betrieblicher Notwendigkeit anzupassen (z. B. bei Sonderveranstaltungen
                    oder Wartungsarbeiten). Wesentliche Änderungen werden rechtzeitig angekündigt.
                  </p>
                  <p>
                    <strong className="text-white/70">Zugang:</strong> Der Zugang zum Studio erfolgt über
                    die persönliche Mitgliedskarte oder digitalen Zugang. Die Zugangsmittel sind persönlich
                    und dürfen nicht an Dritte weitergegeben werden. Bei Verlust ist das Studio unverzüglich
                    zu informieren.
                  </p>
                  <p>
                    <strong className="text-white/70">Betriebsbedingte Schließungen:</strong> Kurzfristige
                    Schließungen aus zwingenden Gründen (Reparaturen, höhere Gewalt, behördliche Anordnungen)
                    berechtigen nicht zur Beitragsminderung, sofern die Schließung 3 aufeinanderfolgende
                    Tage nicht überschreitet. Bei längeren Schließungen wird eine anteilige Erstattung oder
                    Verlängerung gewährt.
                  </p>
                </SectionCard>

                {/* ── 08 – Probetraining ── */}
                <SectionCard id="probe" num="08" title="PROBETRAINING" icon={Heart} reduced={reduced} onView={setActive}>
                  <p>
                    Der NAC bietet Interessenten die Möglichkeit eines kostenlosen Probetrainings. Das
                    Probetraining begründet kein Mitgliedschaftsverhältnis und ist einmalig pro Person
                    möglich.
                  </p>
                  <p>
                    Für das Probetraining gelten alle Regelungen dieser AGB, insbesondere die Hausordnung
                    und die Haftungsbestimmungen, entsprechend. Das Probetraining ist unter Voranmeldung
                    über das Kontaktformular, telefonisch oder direkt vor Ort zu vereinbaren.
                  </p>
                  <p>
                    Minderjährige können ein Probetraining nur in Begleitung eines Erziehungsberechtigten
                    absolvieren.
                  </p>
                </SectionCard>

                {/* ── 09 – Firmenfitness ── */}
                <SectionCard id="firmenfitness" num="09" title="FIRMENFITNESS" icon={Building2} reduced={reduced} onView={setActive}>
                  <p>
                    Der NAC bietet Unternehmen maßgeschneiderte Firmenfitness-Programme an. Die Konditionen
                    für Firmenmitgliedschaften werden individuell in einem separaten Firmenvertrag
                    vereinbart.
                  </p>
                  <p>
                    <strong className="text-white/70">Steuerliche Vorteile:</strong> Firmenfitness-Beiträge
                    können gemäß § 3 Nr. 34 EStG bis zu 600 € pro Mitarbeiter und Jahr steuerfrei gestellt
                    werden. Alternativ besteht die Möglichkeit der Sachbezugsregelung gemäß § 8 Abs. 2 S.
                    11 EStG (50 €/Monat). Die steuerliche Behandlung obliegt dem jeweiligen Unternehmen.
                  </p>
                  <p>
                    Für die Firmenmitgliedschaft gelten die allgemeinen AGB ergänzend, soweit der
                    Firmenvertrag keine abweichenden Regelungen enthält.
                  </p>
                </SectionCard>

                {/* ── 10 – Hausordnung ── */}
                <SectionCard id="hausordnung" num="10" title="HAUSORDNUNG & NUTZUNGSREGELN" icon={CheckCircle2} reduced={reduced} onView={setActive}>
                  <p>Mitglieder sind verpflichtet, die Hausordnung des NAC einzuhalten. Diese umfasst insbesondere:</p>
                  <ul className="space-y-1.5 mt-1">
                    {[
                      "Geräte nach der Nutzung mit dem bereitgestellten Desinfektionsmittel reinigen",
                      "Gewichte und Equipment nach Gebrauch ordnungsgemäß zurückräumen",
                      "Geeignete und saubere Sportbekleidung (inkl. Hallensportschuhe) tragen",
                      "Handtuch als Unterlage bei Nutzung der Geräte verwenden",
                      "Anweisungen des Personals und der Trainer Folge leisten",
                      "Keine Foto- oder Videoaufnahmen anderer Personen ohne deren ausdrückliche Einwilligung",
                      "Mitgliedsausweis beim Betreten vorhalten oder vorzeigen",
                      "Beschädigungen an Geräten oder Einrichtung unverzüglich dem Personal melden",
                      "Kein Mitbringen von Glasflaschen in den Trainingsbereich",
                      "Keine leistungssteigernden Substanzen im Studio konsumieren oder handeln",
                      "Respektvoller Umgang mit anderen Mitgliedern und dem Personal",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ background: "var(--brand)" }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Bei schwerwiegenden oder wiederholten Verstößen gegen die Hausordnung ist der NAC
                    berechtigt, das Mitglied mit sofortiger Wirkung vom Trainingsgelände zu verweisen
                    und den Vertrag außerordentlich fristlos zu kündigen. Bereits gezahlte Beiträge
                    werden in diesem Fall nicht erstattet.
                  </p>
                </SectionCard>

                {/* ── 11 – Haftung ── */}
                <SectionCard id="haftung" num="11" title="HAFTUNG & VERSICHERUNG" icon={ShieldAlert} reduced={reduced} onView={setActive}>
                  <p>
                    <strong className="text-white/70">Eigenverantwortung:</strong> Das Training erfolgt
                    eigenverantwortlich. Das Mitglied versichert, dass keine gesundheitlichen Einschränkungen
                    bestehen, die einer Nutzung der Einrichtungen entgegenstehen. Bei Vorliegen von
                    gesundheitlichen Einschränkungen ist das Mitglied verpflichtet, den NAC vor
                    Trainingsbeginn darüber zu informieren.
                  </p>
                  <p>
                    <strong className="text-white/70">CrossFit / HYROX:</strong> Für die Teilnahme an
                    CrossFit-Klassen und HYROX-Training gelten besondere Sicherheitshinweise. Die Teilnahme
                    erfolgt auf eigene Verantwortung. Die Trainer geben Technikanweisungen, deren Befolgung
                    obligatorisch ist. Bei Nichtbefolgen behält sich der NAC vor, die Teilnahme zu verweigern.
                  </p>
                  <p>
                    <strong className="text-white/70">Haftungsbeschränkung:</strong> Der NAC haftet
                    unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit
                    sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen. Im Übrigen ist
                    die Haftung auf vorhersehbare, vertragstypische Schäden begrenzt.
                  </p>
                  <p>
                    <strong className="text-white/70">Garderobe & Wertgegenstände:</strong> Der NAC
                    übernimmt keine Haftung für Diebstahl, Beschädigung oder Verlust von Gegenständen,
                    die in die Räumlichkeiten eingebracht werden. Wertgegenstände sind in den
                    bereitgestellten Schließfächern aufzubewahren. Eine Aufbewahrungspflicht des NAC
                    besteht nicht.
                  </p>
                  <p>
                    <strong className="text-white/70">Versicherung:</strong> Es wird empfohlen, eine
                    private Haftpflicht- und Unfallversicherung abzuschließen. Der NAC verfügt über eine
                    Betriebshaftpflichtversicherung.
                  </p>
                </SectionCard>

                {/* ── 12 – Datenschutz ── */}
                <SectionCard id="datenschutz" num="12" title="DATENSCHUTZ" icon={ShieldCheck} reduced={reduced} onView={setActive}>
                  <p>
                    Der NAC erhebt und verarbeitet personenbezogene Daten der Mitglieder ausschließlich zur
                    Erfüllung und Durchführung der Mitgliedschaft und auf Grundlage der gesetzlichen
                    Bestimmungen (DSGVO, TDDDG). Die Daten werden nur so lange gespeichert, wie es für
                    die Vertragsdurchführung und gesetzliche Aufbewahrungsfristen erforderlich ist.
                  </p>
                  <p>
                    Näheres zu Art, Umfang und Zweck der Datenerhebung, zur Nutzung von Cookies, Google
                    Analytics und weiteren Diensten regelt unsere Datenschutzerklärung:
                  </p>
                  <Link to="/datenschutz"
                    className="inline-flex items-center gap-2 px-4 py-2.5 mt-1 transition-all duration-200"
                    style={{ background: "rgba(202,12,133,0.07)", border: "1px solid rgba(202,12,133,0.2)", color: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.5)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.2)"; }}
                  >
                    <ShieldCheck size={13} />
                    ZUR DATENSCHUTZERKLÄRUNG
                    <ArrowRight size={12} />
                  </Link>
                </SectionCard>

                {/* ── 13 – Änderungen ── */}
                <SectionCard id="aenderungen" num="13" title="ÄNDERUNGEN DER AGB" icon={RefreshCw} reduced={reduced} onView={setActive}>
                  <p>
                    Der NAC behält sich vor, diese AGB mit einer Ankündigungsfrist von mindestens 6 Wochen
                    in Textform (E-Mail oder Brief) zu ändern. Die Änderungen werden dem Mitglied mitgeteilt.
                  </p>
                  <p>
                    Widerspricht das Mitglied der Änderung nicht innerhalb von 4 Wochen nach Zugang der
                    Mitteilung in Textform, gilt die Änderung als genehmigt. Auf dieses Widerspruchsrecht
                    und die Bedeutung des Schweigens wird in der Änderungsmitteilung ausdrücklich hingewiesen.
                  </p>
                  <p>
                    Im Falle des Widerspruchs ist der NAC berechtigt, den Vertrag zum Zeitpunkt des
                    Inkrafttretens der Änderungen ordentlich zu kündigen. Das Sonderkündigungsrecht des
                    Mitglieds bleibt ebenfalls unberührt.
                  </p>
                </SectionCard>

                {/* ── 14 – Schlussbestimmungen ── */}
                <SectionCard id="schluss" num="14" title="SCHLUSSBESTIMMUNGEN" icon={Gavel} reduced={reduced} onView={setActive}>
                  <p>
                    Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).
                  </p>
                  <p>
                    Gerichtsstand für alle Streitigkeiten ist Göppingen, sofern das Mitglied Kaufmann,
                    juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist
                    oder keinen allgemeinen Gerichtsstand in Deutschland hat.
                  </p>
                  <p>
                    Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden,
                    so wird die Wirksamkeit der übrigen Bestimmungen davon nicht berührt (salvatorische
                    Klausel). Die unwirksame Bestimmung ist durch eine wirksame zu ersetzen, die dem
                    wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.
                  </p>
                  <p>
                    Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen des Vertrages bedürfen
                    der Textform. Dies gilt auch für eine Änderung dieser Textformklausel.
                  </p>

                  <div className="p-3 mt-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/50 text-xs">
                      {s.company_name} · {s.company_street} · {s.company_zip} {s.company_city} ·
                      {s.company_court} · {s.company_hrb} · Geschäftsführer: {s.ceo} · Stand: März 2026
                    </p>
                  </div>
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
                      <p className="text-white/40 text-xs">DSGVO, Cookies, Google Analytics & mehr</p>
                    </div>
                    <ArrowRight size={14} className="ml-auto text-white/20 group-hover:text-brand transition-colors shrink-0" />
                  </Link>
                  <Link to="/impressum"
                    className="flex items-center gap-3 p-5 group transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(202,12,133,0.3)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.15)" }}>
                      <Building2 size={16} style={{ color: "var(--brand)" }} />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm group-hover:text-brand transition-colors" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.05em" }}>
                        IMPRESSUM
                      </p>
                      <p className="text-white/40 text-xs">Angaben gemäß § 5 DDG</p>
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
                      FRAGEN ZU DEN AGB?
                    </p>
                    <p className="text-white/50 text-sm">Wir beraten dich gerne persönlich.</p>
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
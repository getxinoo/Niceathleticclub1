/**
 * press.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Presseberichte / Medienerwaehnungen – Typen und Initialdaten.
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type MediaType = "Online" | "Print" | "Print / Online" | "TV" | "Radio" | "Podcast";

export interface PressArticle {
  id: string;
  /** Name der Publikation / des Mediums */
  outlet: string;
  /** Ueberschrift / Titel des Artikels */
  title: string;
  /** Vollstaendige URL zum Artikel */
  url: string;
  /** Datum als ISO-String (YYYY-MM-DD) */
  date: string;
  /** Art des Mediums */
  mediaType: MediaType;
  /** Optionale kurze Beschreibung */
  excerpt?: string;
  /** Optionale Thumbnail-URL (Bild zum Artikel) */
  image?: string;
}

// ── Helper ──────────────────────────────────────────────────────────────────��
let _nextId = 100;
function pid(): string {
  return `press-${_nextId++}`;
}

// ── Initial Data (echte Presseberichte) ──────────────────────────────────────
export const PRESS_ARTICLES: PressArticle[] = [
  {
    id: pid(),
    outlet: "eGym",
    title: "Mimi Kraus & eGym Genius",
    url: "https://de.egym.com/de/blog/mimi-kraus-egym-genius",
    date: "2024-06-15",
    mediaType: "Online",
  },
  {
    id: pid(),
    outlet: "fitnessmanagement.de",
    title: "Interview Michael Kraus – Nice Fitness & Performance Gym, Athletiktraining & Innovation",
    url: "https://www.fitnessmanagement.de/interview-michael-kraus-nice-fitness-performancegym-athletiktraining-innovation/",
    date: "2024-03-20",
    mediaType: "Online",
  },
  {
    id: pid(),
    outlet: "Suedwest Presse (Sonderthemen)",
    title: "Nice Fitness und Spa Club Goeppingen – Spa Club Eislingen, Buntweberei, Fitnessstudio & Kinderbetreuung",
    url: "https://sonderthemen.swp.de/advertorials/nice-fitness-und-spa-club/goeppingen/spa-club-eislingen-buntweberei-fitnessstudio-kinderbetreuung-178032",
    date: "2024-01-10",
    mediaType: "Print / Online",
  },
  {
    id: pid(),
    outlet: "Frisch Auf! Goeppingen",
    title: "Frisch Auf GP – Nachrichtenarchiv: Nice Athletic Club",
    url: "https://www.frischauf-gp.de/multimedia/nachrichtenarchiv/newsmeldung/?tx_news_pi1%5Bnews%5D=2865&tx_news_pi1%5Bcontroller%5D=News&tx_news_pi1%5Baction%5D=detail&cHash=30a90e45413397b37fad7fe82c88d279",
    date: "2023-11-05",
    mediaType: "Online",
  },
  {
    id: pid(),
    outlet: "Suedwest Presse (Sonderthemen)",
    title: "Nice Fitness und Spa Club – Trainingsangebot, Seniorentarif & Mimi Kraus",
    url: "https://sonderthemen.swp.de/advertorials/nice-fitness-und-spa-club/goeppingen/spa-club-eislingen-trainingsangebot-seniorentarif-mimi-kraus-178056",
    date: "2024-01-10",
    mediaType: "Print / Online",
  },
  {
    id: pid(),
    outlet: "TAG24",
    title: "Mimi und Bella Kraus eroeffnen Fitnessstudio Nice Athletic Club in Goeppingen – Traum geht in Erfuellung",
    url: "https://www.tag24.de/unterhaltung/promis/mimi-kraus/mimi-und-bella-kraus-eroeffnen-fitnessstudio-nice-athletic-club-in-goeppingen-traum-geht-in-erfuellung-1567739",
    date: "2023-09-15",
    mediaType: "Online",
  },
  {
    id: pid(),
    outlet: "Suedwest Presse",
    title: "Der Promi hat viele Leidenschaften: Mimi Kraus – Neues Fitnessstudio am Start, Handball-Karriere noch nicht Geschichte",
    url: "https://www.swp.de/lokales/goeppingen/der-promi-hat-viele-leidenschaften-mimi-kraus_-neues-fitnessstudio-am-start-_-handball-karriere-noch-nicht-geschichte-63469329.html",
    date: "2023-08-20",
    mediaType: "Print / Online",
  },
  {
    id: pid(),
    outlet: "Suedwest Presse",
    title: "Eroeffnungsparty des Handball-Promis: Mimi Kraus rollt fuer die Gaeste den roten Teppich aus",
    url: "https://www.swp.de/lokales/goeppingen/eroeffnungsparty-des-handball-promis-mimi-kraus-rollt-fuer-die-gaeste-den-roten-teppich-aus-63515381.html",
    date: "2023-09-25",
    mediaType: "Print / Online",
  },
  {
    id: pid(),
    outlet: "Architektur Bielke",
    title: "Nutzungsaenderung Nice Athletic Club",
    url: "https://architektur-bielke.de/nutzungsaenderung-nice-atheltic-club/",
    date: "2023-07-01",
    mediaType: "Online",
  },
  {
    id: pid(),
    outlet: "Stuttgarter Nachrichten",
    title: "Michael Kraus, Tobias Unger und Co: Wenn Ex-Profis andere in Form bringen",
    url: "https://www.stuttgarter-nachrichten.de/inhalt.michael-kraus-tobias-unger-und-co-wenn-ex-profis-andere-in-form-bringen.aa9143f0-1368-4ff0-ae3e-4e5c76215aed.html",
    date: "2024-02-14",
    mediaType: "Online",
  },
  {
    id: pid(),
    outlet: "TAG24",
    title: "Mimi Kraus verfolgt seine Traeume – Fitnessstudio Goeppingen, Handball-Star & Instagram",
    url: "https://www.tag24.de/unterhaltung/mimi-kraus-verfolgt-seine-traeume-fitnessstudio-goeppingen-handball-star-instagram-1532955",
    date: "2023-07-20",
    mediaType: "Online",
  },
  {
    id: pid(),
    outlet: "Suedwest Presse",
    title: "Buntweberei in Eislingen: Karo Kauer und Mimi Kraus – Eislinger Wurzeln geben Internet-Promis Halt",
    url: "https://www.swp.de/lokales/goeppingen/buntweberei-in-eislingen-karo-kauer-und-mimi-kraus_-eislinger-wurzeln-geben-internet-promis-halt-66606261.html",
    date: "2024-05-10",
    mediaType: "Print / Online",
  },
  {
    id: pid(),
    outlet: "Suedwest Presse",
    title: "Eislinger Fitnesspfad: Mimi Kraus wird Vorturner fuer die digitalen Uebungen",
    url: "https://www.swp.de/lokales/goeppingen/eislinger-fitnesspfad-mimi-kraus-wird-vorturner-fuer-die-digitalen-uebungen-78590423.html",
    date: "2025-01-18",
    mediaType: "Print / Online",
  },
];
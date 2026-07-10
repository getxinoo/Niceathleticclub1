/**
 * blocks.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Block-System für den NAC Sitebuilder.
 *
 * Jede Seite besteht aus einer geordneten Liste von `PageBlock`-Instanzen.
 * Der `BLOCK_REGISTRY` beschreibt für jeden Blocktyp:
 *   • Metadaten (Label, Icon, Farbe)
 *   • Default-Daten für neue Blöcke
 *   • Feldschema für das Settings-Panel
 */

import { MEMBERSHIP_PLANS } from "./classes";
import type { PageLink } from "../lib/links";
import type { LayoutSettings } from "../lib/cms-types";
import { slotPositionLabel, normalizeLayoutVariant, type StudioLayoutVariant } from "../lib/studio-layout";

// ── Block Instance ────────────────────────────────────────────────────────────

export type BlockType =
  | "hero"
  | "pillars"
  | "stats"
  | "rich-text"
  | "pricing"
  | "reviews"
  | "cta"
  | "team"
  | "contact-form"
  | "pricing-cards"
  | "pricing-addons"
  | "pricing-compare"
  | "faq"
  // ── Neue Block-Typen (Seiten-Abdeckung) ───────────────────────────────────
  | "timetable"       // Kursplan / Stundenplan
  | "zone-grid"       // Studio-Zonen-Raster
  | "trust-badges"    // Vertrauens-Badges / USP-Leiste
  | "trial-form"      // Probetraining-Formular
  | "image-gallery"   // Foto-Galerie (Masonry/Grid)
  | "values-grid"     // Werte / Mission mit Icons
  | "features-list"   // Feature-Liste mit Icon + Text
  | "location-map"    // Standort, Öffnungszeiten, Karte
  | "jobs-board"      // Stellenausschreibungen
  | "pros-cons"       // Vor- & Nachteile Vergleich
  | "legal-content"   // Rechtliche Inhalte (Impressum, DSE, AGB)
  | "opening-hours"   // Öffnungszeiten-Block
  // ── Studio-spezifische Blöcke ────────────────────────────────────────────────
  | "studio-hero"     // Vollbild-Hero mit Image-BG, Breadcrumb, Quick-Stats und CTA
  | "studio-zones"    // Bento Grid 6 Zonen (Desktop) / Swipe Carousel (Mobile)
  | "studio-info"     // Öffnungszeiten + Thekenzeiten + Ausstattung + Kontakt
  // ── Team-spezifische Blöcke ──────────────────────────────────────────────────
  | "team-header"     // Desktop-Header + Mobile-Hero mit Quick-Stats, Breadcrumb, CTA
  | "team-grid";      // Desktop-Grid + Mobile-Carousel (ruft /team.php?visible=1 ab)

export interface PageBlock {
  /** Client-side unique ID (uuid-lite) */
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
  /**
   * Optional per-section visibility. Additive — `undefined`/`false` renders the
   * section exactly as today. When `true`, the public page renderers skip the
   * block and the admin editor shows it dimmed with a "hidden" badge. This is a
   * PAGE-COMPOSITION flag (which sections appear on this page), independent of
   * `pages.status` (whole-page publish) — the two never substitute each other.
   */
  hidden?: boolean;
  /**
   * Optional grid/layout override for this block (columns, gap, padding, ...).
   * Additive — undefined for every block saved so far; renderers must treat
   * a missing `layout` exactly as they do today (their current fixed layout).
   */
  layout?: LayoutSettings;
  /**
   * Optional link for blocks that are themselves clickable (e.g. a CTA
   * banner). Individual card/box items carry their own `link` via
   * `CardItem` (see lib/cms-types.ts) instead of this block-level field.
   */
  link?: PageLink;
}

// ── Typed Block Data ──────────────────────────────────────────────────────────

export interface HeroBlockData {
  mediaType: "image" | "video";
  mediaUrl: string;
  videoLoop: boolean;
  videoMuted: boolean;
  videoStartTime: number;
  videoEndTime: number;
  label: string;
  headlineLine1Normal: string;
  headlineLine1Outline: string;
  headlineLine2Normal: string;
  headlineLine2Outline: string;
  subtitle: string;
  btn1Label: string;
  btn1Url: string;
  btn1Style: "primary" | "ghost";
  btn2Label: string;
  btn2Url: string;
  btn2Style: "primary" | "ghost";
}

export interface PillarsBlockData {
  label: string;
  headlineNormal: string;
  headlineOutline: string;
  subtitle: string;
  /** Mobile Darstellungsart der Pillars-Karten */
  mobileLayout?: "swipe" | "stack";
  // Säule 1
  pillar1Image: string;
  pillar1Tag: string;
  pillar1Headline: string;
  pillar1Desc: string;
  pillar1Cta: string;
  pillar1Link: string;
  // Säule 2
  pillar2Image: string;
  pillar2Tag: string;
  pillar2Headline: string;
  pillar2Desc: string;
  pillar2Cta: string;
  pillar2Link: string;
  // Säule 3
  pillar3Image: string;
  pillar3Tag: string;
  pillar3Headline: string;
  pillar3Desc: string;
  pillar3Cta: string;
  pillar3Link: string;
  // Säule 4
  pillar4Image: string;
  pillar4Tag: string;
  pillar4Headline: string;
  pillar4Desc: string;
  pillar4Cta: string;
  pillar4Link: string;
}

export interface StatsBlockData {
  /** How many stat items to show (2–6) */
  count: number;
  /** Mobile Darstellungsart */
  mobileLayout?: "grid-2" | "swipe";
  item1Icon: string;
  item1Value: string;
  item1Label: string;
  item2Icon: string;
  item2Value: string;
  item2Label: string;
  item3Icon: string;
  item3Value: string;
  item3Label: string;
  item4Icon: string;
  item4Value: string;
  item4Label: string;
  item5Icon: string;
  item5Value: string;
  item5Label: string;
  item6Icon: string;
  item6Value: string;
  item6Label: string;
}

export interface CtaBlockData {
  /** Small badge above the headline */
  label: string;
  headlineNormal: string;
  headlineOutline: string;
  subtitle: string;
  btn1Label: string;
  btn1Url: string;
  btn2Label: string;
  btn2Url: string;
}

export interface RichTextBlockData {
  heading: string;
  content: string;
  centered: boolean;
}

export interface PricingBlockData {
  heading: string;
  subheading: string;
  visiblePlans: Array<"starter" | "performance" | "elite">;
}

export interface ReviewsBlockData {
  heading: string;
  limit: number;
}

export interface TeamBlockData {
  heading: string;
  /** Mobile Darstellungsart */
  mobileLayout?: "swipe" | "stack";
}

export interface ContactFormBlockData {
  heading: string;
  subtitle: string;
  buttonText: string;
  recipientEmail: string;
}

export interface PricingCardsBlockData {
  heading: string;
  selectedPlans: Array<"all" | "athletic-weekend" | "athletic" | "nicest" | "athletic-unlimited">;
}

export interface CmsRepeaterItem {
  _id?: string;
  id: string;
  hidden?: boolean;
}

export interface CmsAddonRepeaterItem extends CmsRepeaterItem {
  optionsConfig?: CmsRepeaterItem[];
}

export interface PricingAddonsBlockData {
  heading: string;
  subtitle: string;
  addonsConfig?: CmsAddonRepeaterItem[];
}

export interface PricingCompareBlockData {
  heading: string;
}

export interface FaqBlockData {
  heading: string;
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

// ── Interfaces für neue Block-Typen ───────────────────────────────────────────

export interface TimetableBlockData {
  heading: string;
  subtitle: string;
  /** Sichtbare Kategorien filtern (leer = alle) */
  visibleCategories: string[];
}

export interface ZoneGridBlockData {
  heading: string;
  subtitle: string;
  /** Sichtbare Zonen-Keys (leer = alle) */
  visibleZones: string[];
}

export interface TrustBadgesBlockData {
  heading: string;
  badges: Array<{
    icon: string;
    text: string;
  }>;
}

export interface TrialFormBlockData {
  heading: string;
  subtitle: string;
  buttonText: string;
  recipientEmail: string;
  /** Liste der Ziel-Optionen im Select */
  goalOptions: string;
}

export interface ImageGalleryBlockData {
  heading: string;
  layout: "masonry" | "grid" | "carousel";
  /** Mobiles Layout */
  mobileLayout?: "stack" | "swipe" | "grid-2";
  /** Kommagetrennte Bild-URLs */
  imageUrls: string;
  columns: number;
}

export interface ValuesGridBlockData {
  heading: string;
  subtitle: string;
  /** Mobiles Layout */
  mobileLayout?: "stack" | "swipe";
  values: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface FeaturesListBlockData {
  heading: string;
  subtitle: string;
  layout: "grid" | "list";
  /** Mobiles Layout */
  mobileLayout?: "stack" | "swipe" | "grid-2";
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface LocationMapBlockData {
  heading: string;
  address: string;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
  phone: string;
  email: string;
  showOpeningHours: boolean;
}

export interface JobsBoardBlockData {
  heading: string;
  subtitle: string;
  /** Zeige nur aktive Jobs aus der API */
  apiDriven: boolean;
  applyEmail: string;
}

export interface ProsConsBlockData {
  heading: string;
  pros: Array<{ text: string }>;
  cons: Array<{ text: string }>;
}

export interface LegalContentBlockData {
  heading: string;
  /** Welche Rechtsseite wird dargestellt */
  pageType: "impressum" | "datenschutz" | "agb";
  content: string;
}

export interface OpeningHoursBlockData {
  heading: string;
  note: string;
  rows: Array<{
    days: string;
    hours: string;
    highlight: boolean;
  }>;
}

// ── Team-spezifische Interfaces ───────────────────────────────────────────────

export interface TeamHeaderBlockData {
  label: string;
  headlineNormal: string;
  headlineOutline: string;
  subtitle: string;
  subtitleMobile: string;
  stat1Val: string;
  stat1Label: string;
  stat2Val: string;
  stat2Label: string;
  stat3Val: string;
  stat3Label: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface TeamGridBlockData {
  heading: string;
  /** API-Endpunkt — /team.php?visible=1 */
  apiEndpoint: string;
  desktopCols: number;
  leadershipSectionLabel: string;
  leadershipHeadlineNormal: string;
  leadershipHeadlineOutline: string;
  coachesSectionLabel: string;
  coachesHeadlineNormal: string;
  coachesHeadlineOutline: string;
  coachesSubtitle: string;
  mobileCTABadge: string;
  mobileCTAHeadline: string;
  mobileCTABtnLabel: string;
  mobileCTABtnUrl: string;
  /**
   * CMS-controlled: ordered list of member slugs/IDs to display.
   * Empty/undefined = show all visible members from API (default = current behavior).
   */
  selectedMemberIds?: string[];
  /**
   * CMS-controlled: member slugs/IDs to hide from this section.
   */
  hiddenMemberIds?: string[];
}

// ── Studio-spezifische Interfaces ─────────────────────────────────────────────

export interface StudioHeroBlockData {
  heroImage: string;
  label: string;
  headlineNormal: string;
  headlineOutline: string;
  subtitle: string;
  subtitleMobile: string;
  quickStat1Val: string;
  quickStat1Label: string;
  quickStat2Val: string;
  quickStat2Label: string;
  quickStat3Val: string;
  quickStat3Label: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface StudioZoneData {
  key: string;
  label: string;
  iconName: string;
  tag: string;
  desc: string;
  image: string;
  /**
   * VERALTET (Slot-Layout): Größe gehört zum SLOT, nicht zur Karte.
   * Bleibt nur für gespeicherte Altdaten im Typ erhalten; die Renderer
   * ignorieren dieses Feld — welche Karte groß erscheint, bestimmt allein
   * layoutVariant + sichtbare Position (siehe lib/studio-layout.ts).
   */
  large?: boolean;
  /** undefined = sichtbar. Ausgeblendete Zonen fallen vor der Slot-Berechnung raus. */
  visible?: boolean;
  link?: string;
}

export interface StudioZonesBlockData {
  sectionLabel: string;
  headlineNormal: string;
  headlineOutline: string;
  /** Desktop-Mosaik: "feature-left" (Default) oder "feature-right". */
  layoutVariant?: StudioLayoutVariant;
  zones: StudioZoneData[];
}

export interface StudioHoursRow {
  day: string;
  time: string;
}

export interface StudioAmenityItem {
  iconName: string;
  label: string;
}

export interface StudioInfoBlockData {
  sectionLabel: string;
  headlineNormal: string;
  headlineOutline: string;
  studioHoursHeading: string;
  hours: StudioHoursRow[];
  thekenHoursHeading: string;
  thekenHours: StudioHoursRow[];
  amenitiesHeading: string;
  amenities: StudioAmenityItem[];
  addressHeading: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  contactHeading: string;
  contactEmail: string;
  contactSocial: string;
  ctaLabel: string;
  ctaUrl: string;
}

// ── Field Schema ──────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "link"
  | "toggle"
  | "multiselect"
  | "number"
  | "media"
  | "select"
  | "layout-variant"
  | "repeater";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  /**
   * Only used when `type === "repeater"`.
   * Defines the shape of each item in the list.
   */
  subFields?: FieldSchema[];
  /**
   * Only used when `type === "media"`.
   * Vorgeschlagene Bilder / Bildarchiv – klickbar im Media-Uploader.
   */
  imageSuggestions?: Array<{ url: string; label: string }>;
  /**
   * Only used when `type === "repeater"`.
   * Liefert die Positions-/Rollenkennzeichnung eines Eintrags für die
   * Item-Kopfzeile im Settings-Panel (z. B. "Position 1 · Groß links").
   * visibleIndex ist der 0-basierte Index innerhalb der SICHTBAREN Einträge,
   * oder null wenn der Eintrag selbst ausgeblendet ist. blockData sind die
   * aktuellen (ungespeicherten) Daten des gesamten Blocks, damit z. B. die
   * Layout-Variante berücksichtigt werden kann. Reine Anzeige, keine Logik.
   */
  positionRole?: (visibleIndex: number | null, blockData: Record<string, unknown>) => string;
  /**
   * Only used when `type === "toggle"`.
   * Anzeigewert, wenn das Datenfeld noch undefined ist (Altdaten). Beispiel
   * Zonen-Sichtbarkeit: undefined bedeutet "sichtbar" → toggleDefault: true,
   * sonst zeigt der Schalter fälschlich "aus" für sichtbare Alt-Einträge.
   */
  toggleDefault?: boolean;
}

// ── Block Definition ──────────────────────────────────────────────────────────

export interface BlockDefinition {
  type: BlockType;
  label: string;
  iconName: string;
  description: string;
  color: string;
  defaultData: Record<string, unknown>;
  fields: FieldSchema[];
}

// ── Shared icon options for Stats items ──────────────────────────────────────
const ICON_OPTIONS = [
  { value: "Users",      label: "👥 Mitglieder" },
  { value: "Star",       label: "⭐ Bewertung" },
  { value: "Dumbbell",   label: "🏋️ Training" },
  { value: "Award",      label: "🏆 Award" },
  { value: "Clock",      label: "🕐 Zeit" },
  { value: "TrendingUp", label: "📈 Wachstum" },
  { value: "Heart",      label: "❤️ Community" },
  { value: "Zap",        label: "⚡ Performance" },
  { value: "Target",     label: "🎯 Ziel" },
  { value: "Shield",     label: "🛡️ Sicherheit" },
];

// ── Block Registry ────────────────────────────────────────────────────────────

export const BLOCK_REGISTRY: Record<BlockType, BlockDefinition> = {

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    type: "hero",
    label: "Hero Section",
    iconName: "Layers",
    description: "Vollbild-Eingangsbereich mit Video/Bild-Hintergrund, mehrzeiliger Headline und zwei CTA-Buttons.",
    color: "#CA0C85",
    defaultData: {
      mediaType: "video",
      mediaUrl: "https://wordpress.nice-fitness.de/wp-content/uploads/2025/11/hero_IFx5MWqF.mp4",
      videoLoop: true,
      videoMuted: true,
      videoStartTime: 0,
      videoEndTime: 0,
      label: "Göppingen · Täglich 5:00 – 00:00 Uhr",
      headlineLine1Normal: "IT'S NOT JUST A",
      headlineLine1Outline: "GYM",
      headlineLine2Normal: "IT'S A",
      headlineLine2Outline: "VIBE!",
      subtitle: "Welcome to NICE. We take training & espresso seriously. Wir haben nicht einfach nur Geräte – wir haben die Besten. Von Conditioning bis Heavy Machines - Alles unter einem Dach. Train hard. Stay NICE.",
      btn1Label: "Öffnungszeiten",
      btn1Url: "/studio",
      btn1Style: "ghost",
      btn2Label: "Kurspläne ansehen",
      btn2Url: "/kurse",
      btn2Style: "ghost",
    } satisfies HeroBlockData,
    fields: [
      { key: "mediaType", label: "Medientyp", type: "select", options: [{ value: "video", label: "Video" }, { value: "image", label: "Bild" }] },
      {
        key: "mediaUrl", label: "Medien-URL", type: "media",
        placeholder: "https://… oder Datei hochladen",
        description: "MP4 für Video, beliebiges Bildformat für Bild-Hintergrund. Oder ein Bild aus dem Archiv auswählen.",
        imageSuggestions: [
          { url: "https://images.unsplash.com/photo-1689514226794-beb8df907ef7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920", label: "Athletic Training" },
          { url: "https://images.unsplash.com/photo-1585484764802-387ea30e8432?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920", label: "Gym Weights Dark" },
          { url: "https://images.unsplash.com/photo-1758789667761-130b9684cfde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920", label: "CrossFit Industrial" },
          { url: "https://images.unsplash.com/photo-1693214674451-2111f7690877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920", label: "Premium Interior" },
          { url: "https://images.unsplash.com/photo-1769614469134-139f45a469f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920", label: "Strength Athlete" },
          { url: "https://images.unsplash.com/photo-1648659125396-5bf148702e3d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920", label: "Fitness Club" },
          { url: "https://images.unsplash.com/photo-1761971975769-97e598bf526b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920", label: "Studio Equipment" },
        ],
      },
      { key: "videoLoop", label: "Video wiederholen", type: "toggle" },
      { key: "videoMuted", label: "Video stummschalten", type: "toggle" },
      { key: "videoStartTime", label: "Video Start-Zeit (Sek.)", type: "number", min: 0, step: 1 },
      { key: "videoEndTime", label: "Video End-Zeit (Sek.)", type: "number", min: 0, step: 1 },
      { key: "label", label: "Label / Badge", type: "text", placeholder: "Göppingen · Täglich 5:00 – 00:00 Uhr" },
      { key: "headlineLine1Normal", label: "Headline Zeile 1 – Normal", type: "text", placeholder: "IT'S NOT JUST A" },
      { key: "headlineLine1Outline", label: "Headline Zeile 1 – Outline", type: "text", placeholder: "GYM" },
      { key: "headlineLine2Normal", label: "Headline Zeile 2 – Normal", type: "text", placeholder: "IT'S A" },
      { key: "headlineLine2Outline", label: "Headline Zeile 2 – Outline", type: "text", placeholder: "VIBE!" },
      { key: "subtitle", label: "Subtext / Body", type: "textarea", placeholder: "Kurze Beschreibung oder Claim…" },
      { key: "btn1Label", label: "Button 1 – Beschriftung", type: "text", placeholder: "Öffnungszeiten" },
      { key: "btn1Url", label: "Button 1 – Link", type: "link", placeholder: "/studio" },
      { key: "btn1Style", label: "Button 1 – Stil", type: "select", options: [{ value: "primary", label: "Primary (Magenta)" }, { value: "ghost", label: "Ghost (Outline)" }] },
      { key: "btn2Label", label: "Button 2 – Beschriftung", type: "text", placeholder: "Kurspläne ansehen" },
      { key: "btn2Url", label: "Button 2 – Link", type: "link", placeholder: "/kurse" },
      { key: "btn2Style", label: "Button 2 – Stil", type: "select", options: [{ value: "primary", label: "Primary (Magenta)" }, { value: "ghost", label: "Ghost (Outline)" }] },
    ],
  },

  // ── Pillars (Trainingsangebot) ────────────────────────────────────────────────
  pillars: {
    type: "pillars",
    label: "Trainingsangebot",
    iconName: "Dumbbell",
    description: "Vier Trainingszonen-Karten mit Bild, Tag, Headline, Beschreibung und CTA-Link.",
    color: "#0ea5e9",
    defaultData: {
      label: "Trainingsangebot",
      headlineNormal: "VIELE ATHLETEN.",
      headlineOutline: "EIN CLUB.",
      subtitle: "Heavy Machines. Bodybuilding. Powerlifting. Olympic Weightlifting. CrossFit. HYROX. Alles unter einem Dach – keine Kompromisse, nur Ergebnisse.",
      mobileLayout: "swipe",
      pillar1Image: "/images/athletic/hero.png",
      pillar1Tag: "Bodybuilding · Muskelaufbau · Maschinen",
      pillar1Headline: "BUILT FOR BODYBUILDING",
      pillar1Desc: "Im Nice Athletic Club Göppingen trainierst du an Premium-Equipment von Eleiko, Gymleco, Nautilus, Flex Leverage, Body Masters und vieles mehr – von der Beinpresse bis zum Cable Crossover für maximalen Muskelaufbau.",
      pillar1Cta: "Athletic Area entdecken",
      pillar1Link: "/athletic-area",
      pillar2Image: "/images/crossfit/hero.png",
      pillar2Tag: "CrossFit · HYROX · Functional Fitness",
      pillar2Headline: "CROSSFIT GÖPPINGEN",
      pillar2Desc: "CrossFit Göppingen im Nice Athletic Club: WODs, Olympic Lifting, Sled Pushes, Box Jumps & Kettlebell Swings – funktionelles Ganzkörpertraining für Kraft, Ausdauer und Athletik.",
      pillar2Cta: "CrossFit Zone entdecken",
      pillar2Link: "/crossfit-gp",
      pillar3Image: "/images/hyrox/hero.png",
      pillar3Tag: "HYROX · Hybrid Fitness · Wettkampf",
      pillar3Headline: "HYROX",
      pillar3Desc: "HYROX im Nice Athletic Club Göppingen: 8 Stationen von SkiErg bis Wall Balls kombiniert mit Laufen – gezieltes Training für Open, Pro, Doubles & Relay.",
      pillar3Cta: "HYROX Zone entdecken",
      pillar3Link: "/hyrox",
      pillar4Image: "/images/theke/theke-area.png",
      pillar4Tag: "Espresso · Whey Shakes · Protein Bars",
      pillar4Headline: "DIE NICE THEKE",
      pillar4Desc: "Lempresso aus der Siebträgermaschine, Whey Shakes, Protein Bars und mehr – dein Treffpunkt vor und nach dem Training.",
      pillar4Cta: "Studio entdecken",
      pillar4Link: "/nice-theke",
    } satisfies PillarsBlockData,
    fields: [
      { key: "label", label: "Abschnitts-Label", type: "text", placeholder: "Trainingsangebot" },
      { key: "headlineNormal", label: "Headline – Normal", type: "text", placeholder: "VIELE ATHLETEN." },
      { key: "headlineOutline", label: "Headline – Outline", type: "text", placeholder: "EIN CLUB." },
      { key: "subtitle", label: "Subtext", type: "textarea" },
      // Säule 1
      { key: "mobileLayout", label: "📱 Mobile Darstellung", type: "select", options: [{ value: "swipe", label: "Swipe-Karussell (mit Dots)" }, { value: "stack", label: "Übereinander (Stack)" }], description: "Wie werden die Karten auf dem Smartphone dargestellt?" },
      { key: "pillar1Image", label: "Säule 1 – Bild", type: "media" },
      { key: "pillar1Tag", label: "Säule 1 – Tag", type: "text", placeholder: "Bodybuilding · Muskelaufbau · Maschinen" },
      { key: "pillar1Headline", label: "Säule 1 – Headline", type: "text", placeholder: "BUILT FOR BODYBUILDING" },
      { key: "pillar1Desc", label: "Säule 1 – Beschreibung", type: "textarea" },
      { key: "pillar1Cta", label: "Säule 1 – Button-Text", type: "text", placeholder: "Athletic Area entdecken" },
      { key: "pillar1Link", label: "Säule 1 – Link", type: "link", placeholder: "/athletic-area" },
      // Säule 2
      { key: "pillar2Image", label: "Säule 2 – Bild", type: "media" },
      { key: "pillar2Tag", label: "Säule 2 – Tag", type: "text", placeholder: "CrossFit · HYROX · Functional Fitness" },
      { key: "pillar2Headline", label: "Säule 2 – Headline", type: "text", placeholder: "CROSSFIT GÖPPINGEN" },
      { key: "pillar2Desc", label: "Säule 2 – Beschreibung", type: "textarea" },
      { key: "pillar2Cta", label: "Säule 2 – Button-Text", type: "text", placeholder: "CrossFit Zone entdecken" },
      { key: "pillar2Link", label: "Säule 2 – Link", type: "link", placeholder: "/crossfit-gp" },
      // Säule 3
      { key: "pillar3Image", label: "Säule 3 – Bild", type: "media" },
      { key: "pillar3Tag", label: "Säule 3 – Tag", type: "text", placeholder: "HYROX · Hybrid Fitness · Wettkampf" },
      { key: "pillar3Headline", label: "Säule 3 – Headline", type: "text", placeholder: "HYROX" },
      { key: "pillar3Desc", label: "Säule 3 – Beschreibung", type: "textarea" },
      { key: "pillar3Cta", label: "Säule 3 – Button-Text", type: "text", placeholder: "HYROX Zone entdecken" },
      { key: "pillar3Link", label: "Säule 3 – Link", type: "link", placeholder: "/hyrox" },
      // Säule 4
      { key: "pillar4Image", label: "Säule 4 – Bild", type: "media" },
      { key: "pillar4Tag", label: "Säule 4 – Tag", type: "text", placeholder: "Espresso · Whey Shakes · Protein Bars" },
      { key: "pillar4Headline", label: "Säule 4 – Headline", type: "text", placeholder: "DIE NICE THEKE" },
      { key: "pillar4Desc", label: "Säule 4 – Beschreibung", type: "textarea" },
      { key: "pillar4Cta", label: "Säule 4 – Button-Text", type: "text", placeholder: "Studio entdecken" },
      { key: "pillar4Link", label: "Säule 4 – Link", type: "link", placeholder: "/nice-theke" },
    ],
  },

  // ── Stats (Kennzahlen) ────────────────────────────────────────────────────────
  stats: {
    type: "stats",
    label: "Stats & Kennzahlen",
    iconName: "BarChart2",
    description: "Kennzahlen mit Icon, großer Zahl und Label. Bis zu 6 Einträge konfigurierbar.",
    color: "#f59e0b",
    defaultData: {
      count: 2,
      mobileLayout: "grid-2",
      item1Icon: "Users",
      item1Value: "1.500+",
      item1Label: "qm Trainingsfläche",
      item2Icon: "Star",
      item2Value: "4,9/5",
      item2Label: "Google · 84 Rezensionen",
      item3Icon: "Dumbbell",
      item3Value: "",
      item3Label: "",
      item4Icon: "Award",
      item4Value: "",
      item4Label: "",
      item5Icon: "Heart",
      item5Value: "",
      item5Label: "",
      item6Icon: "Zap",
      item6Value: "",
      item6Label: "",
    } satisfies StatsBlockData,
    fields: [
      { key: "count", label: "Anzahl Einträge", type: "number", min: 2, max: 6, step: 1, description: "Wie viele Stats werden angezeigt? (2–6)" },
      { key: "mobileLayout", label: "📱 Mobile Darstellung", type: "select", options: [{ value: "grid-2", label: "2-Spalten-Grid" }, { value: "swipe", label: "Swipe-Karussell (mit Dots)" }] },
      // Item 1
      { key: "item1Icon", label: "Eintrag 1 – Icon", type: "select", options: ICON_OPTIONS },
      { key: "item1Value", label: "Eintrag 1 – Zahl / Wert", type: "text", placeholder: "1.500+" },
      { key: "item1Label", label: "Eintrag 1 – Label", type: "text", placeholder: "qm Trainingsfläche" },
      // Item 2
      { key: "item2Icon", label: "Eintrag 2 – Icon", type: "select", options: ICON_OPTIONS },
      { key: "item2Value", label: "Eintrag 2 – Zahl / Wert", type: "text", placeholder: "4,9/5" },
      { key: "item2Label", label: "Eintrag 2 – Label", type: "text", placeholder: "Google · 84 Rezensionen" },
      // Item 3
      { key: "item3Icon", label: "Eintrag 3 – Icon", type: "select", options: ICON_OPTIONS },
      { key: "item3Value", label: "Eintrag 3 – Zahl / Wert", type: "text", placeholder: "z. B. 38" },
      { key: "item3Label", label: "Eintrag 3 – Label", type: "text", placeholder: "Kurse pro Woche" },
      // Item 4
      { key: "item4Icon", label: "Eintrag 4 – Icon", type: "select", options: ICON_OPTIONS },
      { key: "item4Value", label: "Eintrag 4 – Zahl / Wert", type: "text", placeholder: "" },
      { key: "item4Label", label: "Eintrag 4 – Label", type: "text", placeholder: "" },
      // Item 5
      { key: "item5Icon", label: "Eintrag 5 – Icon", type: "select", options: ICON_OPTIONS },
      { key: "item5Value", label: "Eintrag 5 – Zahl / Wert", type: "text", placeholder: "" },
      { key: "item5Label", label: "Eintrag 5 – Label", type: "text", placeholder: "" },
      // Item 6
      { key: "item6Icon", label: "Eintrag 6 – Icon", type: "select", options: ICON_OPTIONS },
      { key: "item6Value", label: "Eintrag 6 – Zahl / Wert", type: "text", placeholder: "" },
      { key: "item6Label", label: "Eintrag 6 – Label", type: "text", placeholder: "" },
    ],
  },

  // ── Rich Text ────────────────────────────────────────────────────────────────
  "rich-text": {
    type: "rich-text",
    label: "Text & Inhalt",
    iconName: "Type",
    description: "Freitext-Bereich mit optionaler Überschrift und Zentrierung.",
    color: "#60a5fa",
    defaultData: {
      heading: "",
      content: "Schreibe hier deinen Inhalt.",
      centered: false,
    } satisfies RichTextBlockData,
    fields: [
      { key: "heading", label: "Überschrift (optional)", type: "text", placeholder: "Leer lassen für keinen Titel" },
      { key: "content", label: "Text", type: "textarea", placeholder: "Inhalt…" },
      { key: "centered", label: "Text zentrieren", type: "toggle" },
    ],
  },

  // ── Pricing ─────────────────────────────────────────────────────────────────
  pricing: {
    type: "pricing",
    label: "Preise",
    iconName: "CreditCard",
    description: "Preistabelle – wähle, welche Mitgliedschafts-Pakete erscheinen.",
    color: "#4ade80",
    defaultData: {
      heading: "Unsere Mitgliedschaften",
      subheading: "Finde dein perfektes Paket. Flex-Kündigung inklusive.",
      visiblePlans: ["starter", "performance", "elite"],
    } satisfies PricingBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text" },
      { key: "subheading", label: "Unterzeile", type: "text", placeholder: "Kurze Ergänzung…" },
      {
        key: "visiblePlans",
        label: "Angezeigte Pakete",
        type: "multiselect",
        options: [
          { value: "starter",     label: "Starter · 49 €" },
          { value: "performance", label: "Performance · 89 €" },
          { value: "elite",       label: "Elite · 149 €" },
        ],
      },
    ],
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────
  reviews: {
    type: "reviews",
    label: "Google Bewertungen",
    iconName: "Star",
    description: "Zeigt die neuesten Google-Bewertungen aus der Datenbank an (via PHP-API).",
    color: "#FBBC05",
    defaultData: {
      heading: "Was unsere Mitglieder sagen",
      limit: 9,
    } satisfies ReviewsBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Was unsere Mitglieder sagen" },
      { key: "limit", label: "Anzahl Bewertungen", type: "number", min: 1, max: 20, step: 1, description: "Wie viele Bewertungen maximal anzeigen?" },
    ],
  },

  // ── CTA Banner ───────────────────────────────────────────────────────────────
  cta: {
    type: "cta",
    label: "CTA-Banner",
    iconName: "Zap",
    description: "Call-to-Action Banner mit Headline, Subtext und zwei Buttons – z. B. 'JOIN THE MOVEMENT'.",
    color: "#e879f9",
    defaultData: {
      label: "Community",
      headlineNormal: "JOIN THE",
      headlineOutline: "MOVEMENT",
      subtitle: "Über 1.000 aktive Mitglieder. 10 zertifizierte Trainer. Ein gemeinsames Ziel: das Beste aus sich herausholen. Bist du bereit?",
      btn1Label: "Probetraining",
      btn1Url: "/kontakt",
      btn2Label: "Unser Team kennenlernen",
      btn2Url: "/team",
    } satisfies CtaBlockData,
    fields: [
      { key: "label", label: "Badge-Text", type: "text", placeholder: "Community" },
      { key: "headlineNormal", label: "Headline – Normal", type: "text", placeholder: "JOIN THE" },
      { key: "headlineOutline", label: "Headline – Outline", type: "text", placeholder: "MOVEMENT" },
      { key: "subtitle", label: "Subtext", type: "textarea" },
      { key: "btn1Label", label: "Button 1 – Beschriftung", type: "text", placeholder: "Probetraining" },
      { key: "btn1Url", label: "Button 1 – Link", type: "link", placeholder: "/kontakt" },
      { key: "btn2Label", label: "Button 2 – Beschriftung", type: "text", placeholder: "Unser Team kennenlernen" },
      { key: "btn2Url", label: "Button 2 – Link", type: "link", placeholder: "/team" },
    ],
  },

  // ── Team ─────────────────────────────────────────────────────────────────────
  team: {
    type: "team",
    label: "Team-Übersicht",
    iconName: "Users",
    description: "Zeigt die öffentlichen Team-Profile aus der Datenbank an (via PHP-API).",
    color: "#a855f7",
    defaultData: {
      heading: "Lern unser Team kennen",
      mobileLayout: "swipe",
    } satisfies TeamBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Lern unser Team kennen" },
      { key: "mobileLayout", label: "📱 Mobile Darstellung", type: "select", options: [{ value: "swipe", label: "Swipe-Karussell (mit Dots)" }, { value: "stack", label: "Übereinander (Stack)" }] },
    ],
  },

  // ── Contact Form ────────────────────────────────────────────────────────────
  "contact-form": {
    type: "contact-form",
    label: "Kontaktformular",
    iconName: "Mail",
    description: "Einfaches Kontaktformular – Heading, Einleitungstext, Absenden-Button und Empfänger-Adresse.",
    color: "#f43f5e",
    defaultData: {
      heading: "Schreib uns!",
      subtitle: "Wir freuen uns auf deine Nachricht und melden uns schnellstmöglich zurück.",
      buttonText: "Nachricht senden",
      recipientEmail: "info@nice-fitness.de",
    } satisfies ContactFormBlockData,
    fields: [
      { key: "heading",        label: "Überschrift",      type: "text",     placeholder: "Schreib uns!" },
      { key: "subtitle",       label: "Einleitungstext",  type: "textarea", placeholder: "Wir freuen uns auf deine Nachricht…" },
      { key: "buttonText",     label: "Button-Text",      type: "text",     placeholder: "Nachricht senden" },
      { key: "recipientEmail", label: "Empfänger-E-Mail", type: "text",     placeholder: "info@nice-fitness.de", description: "An diese Adresse werden alle Formular-Einsendungen weitergeleitet." },
    ],
  },

  // ── Pricing Cards ───────────────────────────────────────────────────────────
  "pricing-cards": {
    type: "pricing-cards",
    label: "Preis-Karten",
    iconName: "CreditCard",
    description: "Zeigt Mitgliedschafts-Pakete als visuelle Karten an. Wähle, welche Tarife dargestellt werden.",
    color: "#10b981",
    defaultData: {
      heading: "Unsere Mitgliedschaften",
      selectedPlans: ["all"],
    } satisfies PricingCardsBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Unsere Mitgliedschaften" },
      {
        key: "selectedPlans",
        label: "Angezeigte Tarife",
        type: "multiselect",
        description: "Wähle einen oder mehrere Tarife, die auf dieser Seite gezeigt werden.",
        options: [
          { value: "all",               label: "Alle Tarife" },
          { value: "athletic-weekend",  label: "Athletic Weekend" },
          { value: "athletic",          label: "Athletic" },
          { value: "nicest",            label: "Nicest" },
          { value: "athletic-unlimited",label: "Athletic Unlimited" },
        ],
      },
    ],
  },

  // ── Pricing Addons ──────────────────────────────────────────────────────────
  "pricing-addons": {
    type: "pricing-addons",
    label: "Preis-Addons",
    iconName: "PlusCircle",
    description: "Stellt optionale Zusatzleistungen (Addons) unterhalb der Tarifkarten dar.",
    color: "#06b6d4",
    defaultData: {
      heading: "Optionale Erweiterungen",
      subtitle: "Ergänze deine Mitgliedschaft mit diesen Zusatzleistungen.",
      addonsConfig: [],
    } satisfies PricingAddonsBlockData,
    fields: [
      { key: "heading",  label: "Überschrift", type: "text",     placeholder: "Optionale Erweiterungen" },
      { key: "subtitle", label: "Unterzeile",  type: "textarea", placeholder: "Ergänze deine Mitgliedschaft…" },
      {
        key: "addonsConfig",
        label: "Add-ons anpassen",
        type: "repeater",
        description: "Füge Add-ons über ihren Slug hinzu (z.B. crossfit-hyrox, sauna)",
        subFields: [
          { key: "id", label: "Add-on ID / Slug", type: "text" },
          { key: "hidden", label: "Add-on ausblenden", type: "toggle" },
          { 
            key: "optionsConfig", 
            label: "Optionen anpassen", 
            type: "repeater", 
            description: "Optionen (z.B. '1x pro Woche').",
            subFields: [
              { key: "id", label: "Options-Label", type: "text" },
              { key: "hidden", label: "Option ausblenden", type: "toggle" }
            ] 
          }
        ]
      }
    ],
  },

  // ── Pricing Compare ────────────────────────────────────────────────────────
  "pricing-compare": {
    type: "pricing-compare",
    label: "Tarifvergleich",
    iconName: "Table",
    description: "Vollständige Feature-Vergleichstabelle aller Tarife – wird automatisch aus der Datenbank befüllt.",
    color: "#8b5cf6",
    defaultData: {
      heading: "Tarife im Vergleich",
    } satisfies PricingCompareBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Tarife im Vergleich" },
    ],
  },

  // ── FAQ ─────────────────────────────────────────────────────────────────────
  faq: {
    type: "faq",
    label: "FAQ",
    iconName: "HelpCircle",
    description: "Häufig gestellte Fragen als aufklappbare Akkordeon-Liste.",
    color: "#f59e0b",
    defaultData: {
      heading: "Häufig gestellte Fragen",
      questions: [
        {
          question: "Wie kann ich ein Probetraining buchen?",
          answer: "Einfach das Formular auf unserer Kontaktseite ausfüllen oder uns direkt anrufen – wir melden uns innerhalb von 24 Stunden.",
        },
        {
          question: "Kann ich meine Mitgliedschaft monatlich kündigen?",
          answer: "Ja. Alle unsere Tarife sind monatlich kündbar – kein Kleingedrucktes, keine Mindestlaufzeiten.",
        },
      ],
    } satisfies FaqBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Häufig gestellte Fragen" },
      {
        key: "questions",
        label: "Fragen & Antworten",
        type: "repeater",
        description: "Jeder Eintrag besteht aus einer Frage und einer ausführlichen Antwort.",
        subFields: [
          { key: "question", label: "Frage",   type: "text",     placeholder: "z. B. Kann ich monatlich kündigen?" },
          { key: "answer",   label: "Antwort", type: "textarea", placeholder: "Ausführliche Antwort…" },
        ],
      },
    ],
  },

  // ── Timetable ───────────────────────────────────────────────────────────────
  timetable: {
    type: "timetable",
    label: "Kursplan",
    iconName: "Calendar",
    description: "Zeigt den Kursplan mit Kategorien und Zeiten an.",
    color: "#ec4899",
    defaultData: {
      heading: "Kursplan",
      subtitle: "38 Kurse pro Woche. Für jedes Level.",
      visibleCategories: [],
    } satisfies TimetableBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Kursplan" },
      { key: "subtitle", label: "Unterzeile", type: "text", placeholder: "38 Kurse pro Woche. Für jedes Level." },
      {
        key: "visibleCategories",
        label: "Sichtbare Kategorien",
        type: "multiselect",
        description: "Wähle die Kategorien, die auf dieser Seite gezeigt werden.",
        options: [
          { value: "strength", label: "Stärke" },
          { value: "crossfit", label: "CrossFit" },
          { value: "mobility", label: "Mobilität" },
          { value: "combat", label: "Kampf" },
        ],
      },
    ],
  },

  // ── Zone Grid ───────────────────────────────────────────────────────────────
  "zone-grid": {
    type: "zone-grid",
    label: "Zonen-Raster",
    iconName: "Grid",
    description: "Zeigt die Studio-Zonen als Raster an.",
    color: "#38bdf8",
    defaultData: {
      heading: "Studio-Zonen",
      subtitle: "Von Kraft bis Ausdauer – alles unter einem Dach.",
      visibleZones: [],
    } satisfies ZoneGridBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Studio-Zonen" },
      { key: "subtitle", label: "Unterzeile", type: "text", placeholder: "Von Kraft bis Ausdauer – alles unter einem Dach." },
      {
        key: "visibleZones",
        label: "Sichtbare Zonen",
        type: "multiselect",
        description: "Wähle die Zonen, die auf dieser Seite gezeigt werden.",
        options: [
          { value: "athletic-area", label: "Athletic Area" },
          { value: "crossfit-zone", label: "CrossFit Zone" },
          { value: "hyrox-zone", label: "HYROX Zone" },
          { value: "nice-theke", label: "Nice Theke" },
        ],
      },
    ],
  },

  // ── Trust Badges ────────────────────────────────────────────────────────────
  "trust-badges": {
    type: "trust-badges",
    label: "Vertrauens-Badges",
    iconName: "ShieldCheck",
    description: "Zeigt USP-Badges an, die das Vertrauen in dein Studio stärken.",
    color: "#22c55e",
    defaultData: {
      heading: "Warum NICE?",
      badges: [
        { icon: "Users", text: "Über 1.000 aktive Mitglieder" },
        { icon: "Award", text: "10 zertifizierte Trainer" },
        { icon: "Heart", text: "Ein gemeinsames Ziel: das Beste aus sich herausholen" },
      ],
    } satisfies TrustBadgesBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Warum NICE?" },
      {
        key: "badges",
        label: "Badges",
        type: "repeater",
        description: "Jeder Eintrag besteht aus einem Icon und einem Text.",
        subFields: [
          { key: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { key: "text", label: "Text", type: "text", placeholder: "z. B. Über 1.000 aktive Mitglieder" },
        ],
      },
    ],
  },

  // ── Trial Form ──────────────────────────────────────────────────────────────
  "trial-form": {
    type: "trial-form",
    label: "Probetraining-Formular",
    iconName: "CheckCircle",
    description: "Formular für Probetrainingsanfragen mit Ziel-Optionen.",
    color: "#34d399",
    defaultData: {
      heading: "Probetraining anfragen",
      subtitle: "Wir freuen uns auf deine Anfrage.",
      buttonText: "Senden",
      recipientEmail: "info@nice-fitness.de",
      goalOptions: "Stärke, Ausdauer, Flexibilität",
    } satisfies TrialFormBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Probetraining anfragen" },
      { key: "subtitle", label: "Unterzeile", type: "text", placeholder: "Wir freuen uns auf deine Anfrage." },
      { key: "buttonText", label: "Button-Text", type: "text", placeholder: "Senden" },
      { key: "recipientEmail", label: "Empfänger-E-Mail", type: "text", placeholder: "info@nice-fitness.de", description: "An diese Adresse werden alle Formular-Einsendungen weitergeleitet." },
      { key: "goalOptions", label: "Ziel-Optionen", type: "text", placeholder: "Stärke, Ausdauer, Flexibilität", description: "Kommagetrennte Liste der Ziel-Optionen im Select-Feld." },
    ],
  },

  // ── Image Gallery ───────────────────────────────────────────────────────────
  "image-gallery": {
    type: "image-gallery",
    label: "Foto-Galerie",
    iconName: "Image",
    description: "Zeigt eine Foto-Galerie mit verschiedenen Layouts an.",
    color: "#ec4899",
    defaultData: {
      heading: "Unsere Fotos",
      layout: "masonry",
      mobileLayout: "swipe",
      imageUrls: "https://…/photo1.jpg,https://…/photo2.jpg,https://…/photo3.jpg",
      columns: 3,
    } satisfies ImageGalleryBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Unsere Fotos" },
      { key: "layout", label: "Desktop Layout", type: "select", options: [{ value: "masonry", label: "Masonry" }, { value: "grid", label: "Grid" }, { value: "carousel", label: "Carousel" }] },
      { key: "mobileLayout", label: "📱 Mobile Darstellung", type: "select", options: [{ value: "swipe", label: "Swipe-Karussell (mit Dots)" }, { value: "stack", label: "Übereinander (Stack)" }, { value: "grid-2", label: "2-Spalten-Grid" }] },
      { key: "imageUrls", label: "Bild-URLs", type: "text", placeholder: "https://…/photo1.jpg,https://…/photo2.jpg,https://…/photo3.jpg", description: "Kommagetrennte Bild-URLs." },
      { key: "columns", label: "Desktop Spalten", type: "number", min: 1, max: 6, step: 1, description: "Anzahl der Spalten im Grid-Layout (Desktop)." },
    ],
  },

  // ── Values Grid ─────────────────────────────────────────────────────────────
  "values-grid": {
    type: "values-grid",
    label: "Werte-Grid",
    iconName: "List",
    description: "Zeigt Werte und Mission mit Icons an.",
    color: "#34d399",
    defaultData: {
      heading: "Unsere Werte",
      subtitle: "Was uns motiviert und was wir erreichen wollen.",
      mobileLayout: "swipe",
      values: [
        { icon: "Users", title: "Community", description: "Ein gemeinsames Ziel: das Beste aus sich herausholen." },
        { icon: "Award", title: "Qualität", description: "Zertifizierte Trainer und Premium-Equipment." },
        { icon: "Heart", title: "Passion", description: "Training, das Spaß macht und Ergebnisse bringt." },
      ],
    } satisfies ValuesGridBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Unsere Werte" },
      { key: "subtitle", label: "Unterzeile", type: "text", placeholder: "Was uns motiviert und was wir erreichen wollen." },
      { key: "mobileLayout", label: "📱 Mobile Darstellung", type: "select", options: [{ value: "swipe", label: "Swipe-Karussell (mit Dots)" }, { value: "stack", label: "Übereinander (Stack)" }] },
      {
        key: "values",
        label: "Werte",
        type: "repeater",
        description: "Jeder Eintrag besteht aus einem Icon, einem Titel und einer Beschreibung.",
        subFields: [
          { key: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { key: "title", label: "Titel", type: "text", placeholder: "z. B. Community" },
          { key: "description", label: "Beschreibung", type: "textarea", placeholder: "z. B. Ein gemeinsames Ziel: das Beste aus sich herausholen." },
        ],
      },
    ],
  },

  // ── Features List ───────────────────────────────────────────────────────────
  "features-list": {
    type: "features-list",
    label: "Feature-Liste",
    iconName: "List",
    description: "Zeigt eine Liste von Features mit Icons und Beschreibungen an.",
    color: "#34d399",
    defaultData: {
      heading: "Unsere Features",
      subtitle: "Was wir bieten, um dein Training zu verbessern.",
      layout: "grid",
      mobileLayout: "stack",
      features: [
        { icon: "Users", title: "Community", description: "Ein gemeinsames Ziel: das Beste aus sich herausholen." },
        { icon: "Award", title: "Qualität", description: "Zertifizierte Trainer und Premium-Equipment." },
        { icon: "Heart", title: "Passion", description: "Training, das Spaß macht und Ergebnisse bringt." },
      ],
    } satisfies FeaturesListBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Unsere Features" },
      { key: "subtitle", label: "Unterzeile", type: "text", placeholder: "Was wir bieten, um dein Training zu verbessern." },
      { key: "layout", label: "Desktop Layout", type: "select", options: [{ value: "grid", label: "Grid" }, { value: "list", label: "Liste" }] },
      { key: "mobileLayout", label: "📱 Mobile Darstellung", type: "select", options: [{ value: "stack", label: "Übereinander (Stack)" }, { value: "swipe", label: "Swipe-Karussell (mit Dots)" }, { value: "grid-2", label: "2-Spalten-Grid" }] },
      {
        key: "features",
        label: "Features",
        type: "repeater",
        description: "Jeder Eintrag besteht aus einem Icon, einem Titel und einer Beschreibung.",
        subFields: [
          { key: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { key: "title", label: "Titel", type: "text", placeholder: "z. B. Community" },
          { key: "description", label: "Beschreibung", type: "textarea", placeholder: "z. B. Ein gemeinsames Ziel: das Beste aus sich herausholen." },
        ],
      },
    ],
  },

  // ── Location Map ────────────────────────────────────────────────────────────
  "location-map": {
    type: "location-map",
    label: "Standortkarte",
    iconName: "MapPin",
    description: "Zeigt den Standort, Öffnungszeiten und eine Karte an.",
    color: "#34d399",
    defaultData: {
      heading: "Unser Standort",
      address: "Göppingen, Deutschland",
      googleMapsUrl: "https://maps.google.com/…",
      googleMapsEmbedUrl: "https://maps.google.com/…",
      phone: "+49 123 456 7890",
      email: "info@nice-fitness.de",
      showOpeningHours: true,
    } satisfies LocationMapBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Unser Standort" },
      { key: "address", label: "Adresse", type: "text", placeholder: "Göppingen, Deutschland" },
      { key: "googleMapsUrl", label: "Google Maps URL", type: "url", placeholder: "https://maps.google.com/…" },
      { key: "googleMapsEmbedUrl", label: "Google Maps Embed URL", type: "url", placeholder: "https://maps.google.com/…" },
      { key: "phone", label: "Telefon", type: "text", placeholder: "+49 123 456 7890" },
      { key: "email", label: "E-Mail", type: "text", placeholder: "info@nice-fitness.de" },
      { key: "showOpeningHours", label: "Öffnungszeiten anzeigen", type: "toggle" },
    ],
  },

  // ── Jobs Board ──────────────────────────────────────────────────────────────
  "jobs-board": {
    type: "jobs-board",
    label: "Stellenausschreibungen",
    iconName: "Briefcase",
    description: "Zeigt Stellenausschreibungen aus der Datenbank an (via PHP-API).",
    color: "#34d399",
    defaultData: {
      heading: "Stellenausschreibungen",
      subtitle: "Bereit, dein Training zu übernehmen?",
      apiDriven: true,
      applyEmail: "jobs@nice-fitness.de",
    } satisfies JobsBoardBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Stellenausschreibungen" },
      { key: "subtitle", label: "Unterzeile", type: "text", placeholder: "Bereit, dein Training zu übernehmen?" },
      { key: "apiDriven", label: "Aus der API laden", type: "toggle" },
      { key: "applyEmail", label: "Anmelde-E-Mail", type: "text", placeholder: "jobs@nice-fitness.de", description: "An diese Adresse werden Anmeldungen für Jobs weitergeleitet." },
    ],
  },

  // ── Pros Cons ───────────────────────────────────────────────────────────────
  "pros-cons": {
    type: "pros-cons",
    label: "Vor- & Nachteile",
    iconName: "List",
    description: "Zeigt eine Liste von Vor- und Nachteilen an.",
    color: "#34d399",
    defaultData: {
      heading: "Vor- & Nachteile",
      pros: [
        { text: "Über 1.000 aktive Mitglieder" },
        { text: "10 zertifizierte Trainer" },
        { text: "Ein gemeinsames Ziel: das Beste aus sich herausholen" },
      ],
      cons: [
        { text: "Flex-Kündigung" },
        { text: "Kein Kleingedrucktes" },
        { text: "Keine Mindestlaufzeiten" },
      ],
    } satisfies ProsConsBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Vor- & Nachteile" },
      {
        key: "pros",
        label: "Vorteile",
        type: "repeater",
        description: "Jeder Eintrag besteht aus einem Text.",
        subFields: [
          { key: "text", label: "Text", type: "text", placeholder: "z. B. Über 1.000 aktive Mitglieder" },
        ],
      },
      {
        key: "cons",
        label: "Nachteile",
        type: "repeater",
        description: "Jeder Eintrag besteht aus einem Text.",
        subFields: [
          { key: "text", label: "Text", type: "text", placeholder: "z. B. Flex-Kündigung" },
        ],
      },
    ],
  },

  // ── Legal Content ───────────────────────────────────────────────────────────
  "legal-content": {
    type: "legal-content",
    label: "Rechtliche Inhalte",
    iconName: "FileText",
    description: "Zeigt rechtliche Inhalte wie Impressum, Datenschutz und AGB an.",
    color: "#34d399",
    defaultData: {
      heading: "Impressum",
      pageType: "impressum",
      content: "Hier steht dein Impressum.",
    } satisfies LegalContentBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Impressum" },
      { key: "pageType", label: "Seiten-Typ", type: "select", options: [{ value: "impressum", label: "Impressum" }, { value: "datenschutz", label: "Datenschutz" }, { value: "agb", label: "AGB" }] },
      { key: "content", label: "Inhalt", type: "textarea", placeholder: "Hier steht dein Impressum." },
    ],
  },

  // ── Opening Hours ───────────────────────────────────────────────────────────
  "opening-hours": {
    type: "opening-hours",
    label: "Öffnungszeiten",
    iconName: "Clock",
    description: "Zeigt die Öffnungszeiten an.",
    color: "#34d399",
    defaultData: {
      heading: "Öffnungszeiten",
      note: "Unsere Studio ist täglich geöffnet.",
      rows: [
        { days: "Mo-Fr", hours: "05:00 – 00:00 Uhr", highlight: false },
        { days: "Sa", hours: "05:00 – 00:00 Uhr", highlight: false },
        { days: "So", hours: "05:00 – 00:00 Uhr", highlight: false },
      ],
    } satisfies OpeningHoursBlockData,
    fields: [
      { key: "heading", label: "Überschrift", type: "text", placeholder: "Öffnungszeiten" },
      { key: "note", label: "Hinweis", type: "text", placeholder: "Unsere Studio ist täglich geöffnet." },
      {
        key: "rows",
        label: "Zeilen",
        type: "repeater",
        description: "Jeder Eintrag besteht aus Tagen, Zeiten und einem Highlight-Flag.",
        subFields: [
          { key: "days", label: "Tage", type: "text", placeholder: "z. B. Mo-Fr" },
          { key: "hours", label: "Zeiten", type: "text", placeholder: "z. B. 5:00 – 00:00 Uhr" },
          { key: "highlight", label: "Hervorheben", type: "toggle" },
        ],
      },
    ],
  },

  // ── Team Header ─────────────────────────────────────────────────────────────
  "team-header": {
    type: "team-header",
    label: "Team Hero",
    iconName: "Users",
    description: "Desktop-Header + Mobile-Vollbild-Hero der Team-Seite mit Breadcrumb, Quick-Stats und CTA.",
    color: "#a78bfa",
    defaultData: {
      label: "Die Köpfe dahinter",
      headlineNormal: "UNSER",
      headlineOutline: "TEAM",
      subtitle: "Zertifiziert, erfahren, besessen von Ergebnissen. Klick auf einen Trainer für sein vollständiges Profil.",
      subtitleMobile: "Zertifiziert, erfahren, besessen von Ergebnissen. Tippe auf einen Trainer für das vollständige Profil.",
      stat1Val: "10+",  stat1Label: "Trainer",
      stat2Val: "100%", stat2Label: "Zertifiziert",
      stat3Val: "∞",    stat3Label: "Leidenschaft",
      ctaLabel: "PROBETRAINING VEREINBAREN",
      ctaUrl: "/probetraining",
    } satisfies TeamHeaderBlockData,
    fields: [
      { key: "label",           label: "Label / Badge",           type: "text",     placeholder: "Die Köpfe dahinter" },
      { key: "headlineNormal",  label: "Headline – Normal",       type: "text",     placeholder: "UNSER" },
      { key: "headlineOutline", label: "Headline – Outline",      type: "text",     placeholder: "TEAM" },
      { key: "subtitle",        label: "Subtext Desktop",         type: "textarea" },
      { key: "subtitleMobile",  label: "Subtext Mobile",          type: "textarea" },
      { key: "stat1Val",        label: "Stat 1 Wert",             type: "text",     placeholder: "10+" },
      { key: "stat1Label",      label: "Stat 1 Label",            type: "text",     placeholder: "Trainer" },
      { key: "stat2Val",        label: "Stat 2 Wert",             type: "text",     placeholder: "100%" },
      { key: "stat2Label",      label: "Stat 2 Label",            type: "text",     placeholder: "Zertifiziert" },
      { key: "stat3Val",        label: "Stat 3 Wert",             type: "text",     placeholder: "∞" },
      { key: "stat3Label",      label: "Stat 3 Label",            type: "text",     placeholder: "Leidenschaft" },
      { key: "ctaLabel",        label: "CTA Beschriftung",        type: "text",     placeholder: "PROBETRAINING VEREINBAREN" },
      { key: "ctaUrl",          label: "CTA Link",                type: "text",     placeholder: "/probetraining" },
    ],
  },

  // ── Team Grid ────────────────────────────────────────────────────────────────
  "team-grid": {
    type: "team-grid",
    label: "Team Grid / Carousel",
    iconName: "Users",
    description: "Ruft /team.php?visible=1 ab. Desktop: 3-Spalten-Grid. Mobile: Leadership + Coaches Carousel + CTA-Banner.",
    color: "#60a5fa",
    defaultData: {
      heading: "Unser Team",
      apiEndpoint: "/team.php?visible=1",
      desktopCols: 3,
      leadershipSectionLabel: "GESCHÄFTSFÜHRUNG",
      leadershipHeadlineNormal: "DIE",
      leadershipHeadlineOutline: "GRÜNDER",
      coachesSectionLabel: "COACHING TEAM",
      coachesHeadlineNormal: "DEINE",
      coachesHeadlineOutline: "TRAINER",
      coachesSubtitle: "Swipe durch unser Team und tippe für das volle Profil.",
      mobileCTABadge: "WERDE TEIL DES TEAMS",
      mobileCTAHeadline: "",
      mobileCTABtnLabel: "JETZT BEWERBEN!",
      mobileCTABtnUrl: "/karriere",
    } satisfies TeamGridBlockData,
    fields: [
      { key: "heading",                   label: "Interner Titel",              type: "text",   placeholder: "Unser Team" },
      { key: "apiEndpoint",               label: "API-Endpunkt",                type: "text",   placeholder: "/team.php?visible=1", description: "Dokumentiert welcher Endpunkt aufgerufen wird." },
      { key: "desktopCols",               label: "Desktop Spalten",             type: "number", min: 2, max: 4, step: 1 },
      { key: "leadershipSectionLabel",    label: "Leadership Label",            type: "text",   placeholder: "GESCHÄFTSFÜHRUNG" },
      { key: "leadershipHeadlineNormal",  label: "Leadership Headline Normal",  type: "text",   placeholder: "DIE" },
      { key: "leadershipHeadlineOutline", label: "Leadership Headline Outline", type: "text",   placeholder: "GRÜNDER" },
      { key: "coachesSectionLabel",       label: "Coaches Label",               type: "text",   placeholder: "COACHING TEAM" },
      { key: "coachesHeadlineNormal",     label: "Coaches Headline Normal",     type: "text",   placeholder: "DEINE" },
      { key: "coachesHeadlineOutline",    label: "Coaches Headline Outline",    type: "text",   placeholder: "TRAINER" },
      { key: "coachesSubtitle",           label: "Coaches Subtext Mobile",      type: "text",   placeholder: "Swipe durch unser Team…" },
      { key: "mobileCTABadge",            label: "CTA Badge-Text",              type: "text",   placeholder: "WERDE TEIL DES TEAMS" },
      { key: "mobileCTAHeadline",         label: "CTA Headline (optional)",     type: "text",   placeholder: "Leer lassen = kein Titel", description: "Leer lassen um die Headline auszublenden." },
      { key: "mobileCTABtnLabel",         label: "CTA Button-Text",             type: "text",   placeholder: "JETZT BEWERBEN!" },
      { key: "mobileCTABtnUrl",           label: "CTA Button-Link",             type: "text",   placeholder: "/karriere" },
    ],
  },

  // ── Studio Hero ─────────────────────────────────────────────────────────────
  "studio-hero": {
    type: "studio-hero",
    label: "Studio Hero",
    iconName: "Image",
    description: "Vollbild-Hero der Studio-Seite: Image-BG, Headline, Breadcrumb, Quick-Stats und CTA.",
    color: "#CA0C85",
    defaultData: {
      heroImage: "/images/studio/athletic-zone.png",
      label: "Nice Athletic Club Göppingen",
      headlineNormal: "DAS",
      headlineOutline: "STUDIO",
      subtitle: "Dein Premium Fitness Club in Göppingen – Industrial Gym Style, modernste Ausstattung und eine Community, die dich pusht. Täglich geöffnet von 05:00 bis 00:00 Uhr.",
      subtitleMobile: "Dein Premium Fitness Club – Industrial Gym Style, modernste Ausstattung. Täglich 05:00 – 00:00 Uhr.",
      quickStat1Val: "6",     quickStat1Label: "Zonen",
      quickStat2Val: "05–00", quickStat2Label: "Öffnungszeiten",
      quickStat3Val: "Free",  quickStat3Label: "Parkplätze",
      ctaLabel: "PROBETRAINING VEREINBAREN",
      ctaUrl: "/probetraining",
    } satisfies StudioHeroBlockData,
    fields: [
      { key: "heroImage",       label: "Hintergrundbild",           type: "media" },
      { key: "label",           label: "Label / Badge",             type: "text",     placeholder: "Nice Athletic Club Göppingen" },
      { key: "headlineNormal",  label: "Headline – Normal",         type: "text",     placeholder: "DAS" },
      { key: "headlineOutline", label: "Headline – Outline",        type: "text",     placeholder: "STUDIO" },
      { key: "subtitle",        label: "Subtext Desktop",           type: "textarea" },
      { key: "subtitleMobile",  label: "Subtext Mobile (kürzer)",   type: "textarea" },
      { key: "quickStat1Val",   label: "Stat 1 Wert",               type: "text",     placeholder: "6" },
      { key: "quickStat1Label", label: "Stat 1 Label",              type: "text",     placeholder: "Zonen" },
      { key: "quickStat2Val",   label: "Stat 2 Wert",               type: "text",     placeholder: "05–00" },
      { key: "quickStat2Label", label: "Stat 2 Label",              type: "text",     placeholder: "Öffnungszeiten" },
      { key: "quickStat3Val",   label: "Stat 3 Wert",               type: "text",     placeholder: "Free" },
      { key: "quickStat3Label", label: "Stat 3 Label",              type: "text",     placeholder: "Parkplätze" },
      { key: "ctaLabel",        label: "CTA Beschriftung",          type: "text",     placeholder: "PROBETRAINING VEREINBAREN" },
      { key: "ctaUrl",          label: "CTA Link",                  type: "text",     placeholder: "/probetraining" },
    ],
  },

  // ── Studio Zones ────────────────────────────────────────────────────────────
  "studio-zones": {
    type: "studio-zones",
    label: "Studio Zonen",
    iconName: "Grid",
    description: "Bento-Grid der 6 Trainingszonen (Desktop) / Swipe Carousel mit Dots (Mobile).",
    color: "#38bdf8",
    defaultData: {
      sectionLabel: "Trainingsbereiche",
      headlineNormal: "SECHS ZONEN,",
      headlineOutline: "EIN CLUB",
      layoutVariant: "feature-left",
      zones: [
        { key: "athletic", label: "Athletic Area",    iconName: "Dumbbell",   tag: "Strength · Power · Olympic Lifting",   desc: "Vier vollausgestattete Power Racks, Eleiko-Olympia-Stangen, Technogym-Maschinen und eine Plattform speziell für olympisches Gewichtheben.", image: "/images/studio/athletic-zone.png", large: true,  link: "/athletic-area" },
        { key: "crossfit", label: "CrossFit Zone",   iconName: "Zap",        tag: "Functional · Rig · Boxes",             desc: "Modulares Rig, Wall Balls, GHDs, Assault Bikes – alles für dein WOD.", image: "/images/studio/crossfit-zone.png", large: false, link: "/crossfit-gp" },
        { key: "cardio",   label: "Hyrox Zone",      iconName: "Zap",        tag: "Hyrox · Endurance · Competition",      desc: "Offizieller Hyrox Training Club – SkiErg, Sled Push & Pull, Wall Balls, Burpee Broad Jumps und Farmers Carry auf wettkampfnahem Parcours.", image: "/images/hyrox/hero.png", large: false, link: "/hyrox" },
        { key: "combat",   label: "Theken Bereich",  iconName: "Coffee",     tag: "Shakes · Snacks · Community",          desc: "Protein-Shakes, frische Smoothies, Espresso, gesunde Snacks und Clear Whey – der perfekte Treffpunkt vor und nach dem Training.", image: "/images/theke/theke-area.png", large: false, link: "/nice-theke" },
        { key: "wellness", label: "Premium Duschen", iconName: "ShowerHead", tag: "Regendusche · Terrazzo · Wellness",     desc: "Großzügige Regenduschen mit edlem Terrazzo-Design, Premium-Pflegeprodukte und stilvolle Umkleiden – dein Finish nach jedem Workout.", image: "/images/studio/duschen.png", large: false },
        { key: "recovery", label: "Leg Day Zone",    iconName: "Dumbbell",   tag: "Beinpresse · Hack Squat · Extensions", desc: "Leg Press, Hack Squat, Beinstrecker & -beuger, Waden-Maschinen – Don't Skip Leg Day.", image: "/images/studio/leg-day.png", large: false },
      ],
    } satisfies StudioZonesBlockData,
    fields: [
      { key: "sectionLabel",    label: "Abschnitts-Label",   type: "text", placeholder: "Trainingsbereiche" },
      { key: "headlineNormal",  label: "Headline – Normal",  type: "text", placeholder: "SECHS ZONEN," },
      { key: "headlineOutline", label: "Headline – Outline", type: "text", placeholder: "EIN CLUB" },
      {
        key: "layoutVariant", label: "Desktop-Layout", type: "layout-variant",
        description: "Bestimmt, welcher SLOT groß ist – nicht welche Karte. Die Karte auf der Feature-Position erscheint groß; Umsortieren ändert sofort, welche Karte das ist. Mobile zeigt immer die gespeicherte Reihenfolge 1→2→3…",
      },
      {
        key: "zones", label: "Zonen", type: "repeater",
        description: "Reihenfolge = Position im Mosaik (Pfeile zum Umsortieren). Ausgeblendete Zonen fallen vor der Slot-Berechnung raus – es entsteht kein Loch.",
        positionRole: (visibleIndex, blockData) =>
          visibleIndex === null
            ? "Ausgeblendet"
            : slotPositionLabel(normalizeLayoutVariant(blockData.layoutVariant), visibleIndex),
        subFields: [
          { key: "key",      label: "Schlüssel",       type: "text",     placeholder: "athletic" },
          { key: "label",    label: "Name",            type: "text",     placeholder: "Athletic Area" },
          { key: "iconName", label: "Icon-Name",       type: "text",     placeholder: "Dumbbell" },
          { key: "tag",      label: "Tag",             type: "text",     placeholder: "Strength · Power" },
          { key: "desc",     label: "Beschreibung",    type: "textarea" },
          { key: "image",    label: "Zonenbild",       type: "media" },
          { key: "visible",  label: "Sichtbar",        type: "toggle",   toggleDefault: true },
          { key: "link",     label: "Link (optional)", type: "text",     placeholder: "/athletic-area" },
        ],
      },
    ],
  },

  // ── Studio Info ─────────────────────────────────────────────────────────────
  "studio-info": {
    type: "studio-info",
    label: "Studio Info",
    iconName: "Clock",
    description: "Öffnungszeiten, Thekenzeiten, Ausstattung & Extras, Adresse und Kontakt.",
    color: "#a78bfa",
    defaultData: {
      sectionLabel: "Auf einen Blick",
      headlineNormal: "ALLES",
      headlineOutline: "WICHTIGE",
      studioHoursHeading: "Öffnungszeiten",
      hours: [
        { day: "Täglich",                  time: "05:00 – 00:00" },
        { day: "inkl. Sa, So & Feiertage", time: "05:00 – 00:00" },
      ],
      thekenHoursHeading: "Thekenzeiten",
      thekenHours: [
        { day: "Mo – Fr", time: "08:30 – 21:30" },
        { day: "Sa – So", time: "09:30 – 14:30" },
      ],
      amenitiesHeading: "Ausstattung & Extras",
      amenities: [
        { iconName: "Warehouse",     label: "Einzigartiges Training im Industrial Gym Style" },
        { iconName: "ScanLine",      label: "Self-Check-In für flexible Trainingszeiten" },
        { iconName: "ShowerHead",    label: "Premium Duschen & stilvolle Umkleiden" },
        { iconName: "Wifi",          label: "Kostenloses WLAN im gesamten Club" },
        { iconName: "SquareParking", label: "Kostenlose Parkplätze direkt am Club" },
        { iconName: "Coffee",        label: "Nice Theke – Espresso, Shakes & Snacks" },
      ],
      addressHeading: "Adresse",
      addressLine1: "Nice Athletic Club",
      addressLine2: "Robert-Bosch-Straße 5",
      addressLine3: "73037 Göppingen",
      contactHeading: "Kontakt",
      contactEmail: "info@niceathleticclub.de",
      contactSocial: "Instagram: @niceathleticclub",
      ctaLabel: "PROBETRAINING",
      ctaUrl: "/probetraining",
    } satisfies StudioInfoBlockData,
    fields: [
      { key: "sectionLabel",       label: "Abschnitts-Label",      type: "text", placeholder: "Auf einen Blick" },
      { key: "headlineNormal",     label: "Headline – Normal",     type: "text", placeholder: "ALLES" },
      { key: "headlineOutline",    label: "Headline – Outline",    type: "text", placeholder: "WICHTIGE" },
      { key: "studioHoursHeading", label: "Öffnungszeiten Titel",  type: "text", placeholder: "Öffnungszeiten" },
      { key: "hours", label: "Öffnungszeiten", type: "repeater", subFields: [
        { key: "day", label: "Tage", type: "text", placeholder: "Täglich" },
        { key: "time", label: "Zeit", type: "text", placeholder: "05:00 – 00:00" },
      ]},
      { key: "thekenHoursHeading", label: "Thekenzeiten Titel",    type: "text", placeholder: "Thekenzeiten" },
      { key: "thekenHours", label: "Thekenzeiten", type: "repeater", subFields: [
        { key: "day", label: "Tage", type: "text", placeholder: "Mo – Fr" },
        { key: "time", label: "Zeit", type: "text", placeholder: "08:30 – 21:30" },
      ]},
      { key: "amenitiesHeading", label: "Ausstattung Titel", type: "text", placeholder: "Ausstattung & Extras" },
      { key: "amenities", label: "Ausstattung", type: "repeater", subFields: [
        { key: "iconName", label: "Icon-Name (Lucide)", type: "text", placeholder: "Warehouse" },
        { key: "label",    label: "Text",               type: "text", placeholder: "Premium WLAN" },
      ]},
      { key: "addressHeading", label: "Adresse Titel",      type: "text", placeholder: "Adresse" },
      { key: "addressLine1",   label: "Adresszeile 1",      type: "text", placeholder: "Nice Athletic Club" },
      { key: "addressLine2",   label: "Adresszeile 2",      type: "text", placeholder: "Robert-Bosch-Straße 5" },
      { key: "addressLine3",   label: "Adresszeile 3",      type: "text", placeholder: "73037 Göppingen" },
      { key: "contactHeading", label: "Kontakt Titel",      type: "text", placeholder: "Kontakt" },
      { key: "contactEmail",   label: "E-Mail",             type: "text", placeholder: "info@niceathleticclub.de" },
      { key: "contactSocial",  label: "Social / Instagram", type: "text", placeholder: "Instagram: @niceathleticclub" },
      { key: "ctaLabel",       label: "CTA Beschriftung",   type: "text", placeholder: "PROBETRAINING" },
      { key: "ctaUrl",         label: "CTA Link",           type: "text", placeholder: "/probetraining" },
    ],
  },
};

// ── Initial Page Blocks (Seed) ────────────────────────────────────────────────
/**
 * Seed-Daten für alle öffentlichen Seiten.
 * Schlüssel = URL-Slug, 1:1 identisch mit dem AdminSeiten-Eintrag und PageEditor-Slug.
 */
export const PAGE_INITIAL_BLOCKS: Record<string, PageBlock[]> = {

  // ── Startseite ───────────────────────────────────────────────────────────────
  home: [
    {
      id: "home-hero",
      type: "hero",
      data: {
        mediaType: "video",
        mediaUrl: "https://wordpress.nice-fitness.de/wp-content/uploads/2025/11/hero_IFx5MWqF.mp4",
        videoLoop: true,
        videoMuted: true,
        videoStartTime: 0,
        videoEndTime: 0,
        label: "Göppingen · Täglich 5:00 – 00:00 Uhr",
        headlineLine1Normal: "IT'S NOT JUST A",
        headlineLine1Outline: "GYM",
        headlineLine2Normal: "IT'S A",
        headlineLine2Outline: "VIBE!",
        subtitle: "Welcome to NICE. We take training & espresso seriously. Wir haben nicht einfach nur Geräte – wir haben die Besten. Von Conditioning bis Heavy Machines - Alles unter einem Dach. Train hard. Stay NICE.",
        btn1Label: "Öffnungszeiten",
        btn1Url: "/studio",
        btn1Style: "ghost",
        btn2Label: "Kurspläne ansehen",
        btn2Url: "/kurse",
        btn2Style: "ghost",
      } satisfies HeroBlockData,
    },
    {
      id: "home-pillars",
      type: "pillars",
      data: {
        label: "Trainingsangebot",
        headlineNormal: "VIELE ATHLETEN.",
        headlineOutline: "EIN CLUB.",
        subtitle: "Heavy Machines. Bodybuilding. Powerlifting. Olympic Weightlifting. CrossFit. HYROX. Alles unter einem Dach – keine Kompromisse, nur Ergebnisse.",
        pillar1Image: "/images/athletic/hero.png",
        pillar1Tag: "Bodybuilding · Muskelaufbau · Maschinen",
        pillar1Headline: "BUILT FOR BODYBUILDING",
        pillar1Desc: "Im Nice Athletic Club Göppingen trainierst du an Premium-Equipment von Eleiko, Gymleco, Nautilus, Flex Leverage, Body Masters und vieles mehr – von der Beinpresse bis zum Cable Crossover für maximalen Muskelaufbau.",
        pillar1Cta: "Athletic Area entdecken",
        pillar1Link: "/athletic-area",
        pillar2Image: "/images/crossfit/hero.png",
        pillar2Tag: "CrossFit · HYROX · Functional Fitness",
        pillar2Headline: "CROSSFIT GÖPPINGEN",
        pillar2Desc: "CrossFit Göppingen im Nice Athletic Club: WODs, Olympic Lifting, Sled Pushes, Box Jumps & Kettlebell Swings – funktionelles Ganzkörpertraining für Kraft, Ausdauer und Athletik.",
        pillar2Cta: "CrossFit Zone entdecken",
        pillar2Link: "/crossfit-gp",
        pillar3Image: "/images/hyrox/hero.png",
        pillar3Tag: "HYROX · Hybrid Fitness · Wettkampf",
        pillar3Headline: "HYROX",
        pillar3Desc: "HYROX im Nice Athletic Club Göppingen: 8 Stationen von SkiErg bis Wall Balls kombiniert mit Laufen – gezieltes Training für Open, Pro, Doubles & Relay.",
        pillar3Cta: "HYROX Zone entdecken",
        pillar3Link: "/hyrox",
        pillar4Image: "/images/theke/theke-area.png",
        pillar4Tag: "Espresso · Whey Shakes · Protein Bars",
        pillar4Headline: "DIE NICE THEKE",
        pillar4Desc: "Lempresso aus der Siebträgermaschine, Whey Shakes, Protein Bars und mehr – dein Treffpunkt vor und nach dem Training.",
        pillar4Cta: "Studio entdecken",
        pillar4Link: "/nice-theke",
      } satisfies PillarsBlockData,
    },
    {
      id: "home-stats",
      type: "stats",
      data: {
        count: 2,
        item1Icon: "Users",
        item1Value: "1.500+",
        item1Label: "qm Trainingsfläche",
        item2Icon: "Star",
        item2Value: "4,9/5",
        item2Label: "Google · 84 Rezensionen",
        item3Icon: "Dumbbell",
        item3Value: "",
        item3Label: "",
        item4Icon: "Award",
        item4Value: "",
        item4Label: "",
        item5Icon: "Heart",
        item5Value: "",
        item5Label: "",
        item6Icon: "Zap",
        item6Value: "",
        item6Label: "",
      } satisfies StatsBlockData,
    },
    {
      id: "home-reviews",
      type: "reviews",
      data: {
        heading: "Was unsere Mitglieder sagen",
        limit: 9,
      } satisfies ReviewsBlockData,
    },
    {
      id: "home-cta",
      type: "cta",
      data: {
        label: "Community",
        headlineNormal: "JOIN THE",
        headlineOutline: "MOVEMENT",
        subtitle: "Über 1.000 aktive Mitglieder. 10 zertifizierte Trainer. Ein gemeinsames Ziel: das Beste aus sich herausholen. Bist du bereit?",
        btn1Label: "Probetraining",
        btn1Url: "/kontakt",
        btn2Label: "Unser Team kennenlernen",
        btn2Url: "/team",
      } satisfies CtaBlockData,
    },
  ],

  // ── Studio ───────────────────────────────────────────────────────────────────
  // 1:1 Spiegelbild von Studio.tsx: HeroSection → studio-hero,
  //   ZonesSection → studio-zones, InfoSection → studio-info
  studio: [
    {
      id: "studio-hero",
      type: "studio-hero",
      data: {
        heroImage: "/images/studio/athletic-zone.png",
        label: "Nice Athletic Club Göppingen",
        headlineNormal: "DAS",
        headlineOutline: "STUDIO",
        subtitle: "Dein Premium Fitness Club in Göppingen – Industrial Gym Style, modernste Ausstattung und eine Community, die dich pusht. Täglich geöffnet von 05:00 bis 00:00 Uhr.",
        subtitleMobile: "Dein Premium Fitness Club – Industrial Gym Style, modernste Ausstattung. Täglich 05:00 – 00:00 Uhr.",
        quickStat1Val: "6",     quickStat1Label: "Zonen",
        quickStat2Val: "05–00", quickStat2Label: "Öffnungszeiten",
        quickStat3Val: "Free",  quickStat3Label: "Parkplätze",
        ctaLabel: "PROBETRAINING VEREINBAREN",
        ctaUrl: "/probetraining",
      } satisfies StudioHeroBlockData,
    },
    {
      id: "studio-zones",
      type: "studio-zones",
      data: {
        sectionLabel: "Trainingsbereiche",
        headlineNormal: "SECHS ZONEN,",
        headlineOutline: "EIN CLUB",
        zones: [
          { key: "athletic", label: "Athletic Area",    iconName: "Dumbbell",   tag: "Strength · Power · Olympic Lifting",   desc: "Vier vollausgestattete Power Racks, Eleiko-Olympia-Stangen, Technogym-Maschinen und eine Plattform speziell für olympisches Gewichtheben.", image: "/images/studio/athletic-zone.png", large: true,  link: "/athletic-area" },
          { key: "crossfit", label: "CrossFit Zone",   iconName: "Zap",        tag: "Functional · Rig · Boxes",             desc: "Modulares Rig, Wall Balls, GHDs, Assault Bikes – alles für dein WOD.", image: "/images/studio/crossfit-zone.png", large: false, link: "/crossfit-gp" },
          { key: "cardio",   label: "Hyrox Zone",      iconName: "Zap",        tag: "Hyrox · Endurance · Competition",      desc: "Offizieller Hyrox Training Club – SkiErg, Sled Push & Pull, Wall Balls, Burpee Broad Jumps und Farmers Carry auf wettkampfnahem Parcours.", image: "/images/hyrox/hero.png", large: false, link: "/hyrox" },
          { key: "combat",   label: "Theken Bereich",  iconName: "Coffee",     tag: "Shakes · Snacks · Community",          desc: "Protein-Shakes, frische Smoothies, Espresso, gesunde Snacks und Clear Whey – der perfekte Treffpunkt vor und nach dem Training.", image: "/images/theke/theke-area.png", large: false, link: "/nice-theke" },
          { key: "wellness", label: "Premium Duschen", iconName: "ShowerHead", tag: "Regendusche · Terrazzo · Wellness",     desc: "Großzügige Regenduschen mit edlem Terrazzo-Design, Premium-Pflegeprodukte und stilvolle Umkleiden – dein Finish nach jedem Workout.", image: "/images/studio/duschen.png", large: false },
          { key: "recovery", label: "Leg Day Zone",    iconName: "Dumbbell",   tag: "Beinpresse · Hack Squat · Extensions", desc: "Leg Press, Hack Squat, Beinstrecker & -beuger, Waden-Maschinen – Don't Skip Leg Day.", image: "/images/studio/leg-day.png", large: false },
        ],
      } satisfies StudioZonesBlockData,
    },
    {
      id: "studio-info",
      type: "studio-info",
      data: {
        sectionLabel: "Auf einen Blick",
        headlineNormal: "ALLES",
        headlineOutline: "WICHTIGE",
        studioHoursHeading: "Öffnungszeiten",
        hours: [
          { day: "Täglich",                  time: "05:00 – 00:00" },
          { day: "inkl. Sa, So & Feiertage", time: "05:00 – 00:00" },
        ],
        thekenHoursHeading: "Thekenzeiten",
        thekenHours: [
          { day: "Mo – Fr", time: "08:30 – 21:30" },
          { day: "Sa – So", time: "09:30 – 14:30" },
        ],
        amenitiesHeading: "Ausstattung & Extras",
        amenities: [
          { iconName: "Warehouse",     label: "Einzigartiges Training im Industrial Gym Style" },
          { iconName: "ScanLine",      label: "Self-Check-In für flexible Trainingszeiten" },
          { iconName: "ShowerHead",    label: "Premium Duschen & stilvolle Umkleiden" },
          { iconName: "Wifi",          label: "Kostenloses WLAN im gesamten Club" },
          { iconName: "SquareParking", label: "Kostenlose Parkplätze direkt am Club" },
          { iconName: "Coffee",        label: "Nice Theke – Espresso, Shakes & Snacks" },
        ],
        addressHeading: "Adresse",
        addressLine1: "Nice Athletic Club",
        addressLine2: "Robert-Bosch-Straße 5",
        addressLine3: "73037 Göppingen",
        contactHeading: "Kontakt",
        contactEmail: "info@niceathleticclub.de",
        contactSocial: "Instagram: @niceathleticclub",
        ctaLabel: "PROBETRAINING",
        ctaUrl: "/probetraining",
      } satisfies StudioInfoBlockData,
    },
  ],

  // ── Preise ───────────────────────────────────────────────────────────────────
  // Design: Zentrierter Hero "UNSERE TARIFE" + BASIS TARIFE Pricing Cards
  preise: [
    {
      id: "preise-hero",
      type: "hero",
      data: {
        mediaType: "image",
        mediaUrl: "",
        videoLoop: false,
        videoMuted: true,
        videoStartTime: 0,
        videoEndTime: 0,
        label: "Monatlich kündbar. 100% Performance · 100% Flexibilität",
        headlineLine1Normal: "UNSERE",
        headlineLine1Outline: "TARIFE",
        headlineLine2Normal: "",
        headlineLine2Outline: "",
        subtitle: "Keine Spielchen. Keine versteckten Gebühren. Wir glauben an ehrliche Preise – genau wie an ehrliches Training. Von Weekend-Warrior bis Unlimited-Athlet: Bau dir dein Setup so, wie du trainierst.\n\nModular. Monatlich kündbar. Ab 39 € im Monat. Pick your plan. Stay NICE.",
        btn1Label: "Tarife ansehen",
        btn1Url: "#pakete",
        btn1Style: "primary",
        btn2Label: "Probetraining",
        btn2Url: "/probetraining",
        btn2Style: "ghost",
      } satisfies HeroBlockData,
    },
    {
      id: "preise-stats",
      type: "stats",
      data: {
        count: 4,
        item1Icon: "Users",  item1Value: "1.000+", item1Label: "Aktive Mitglieder",
        item2Icon: "Star",   item2Value: "4,9/5",  item2Label: "Google Bewertung",
        item3Icon: "Zap",    item3Value: "0 €",    item3Label: "Aufnahmegebühr",
        item4Icon: "Clock",  item4Value: "30 Tage",item4Label: "Kündigungsfrist",
        item5Icon: "Heart",  item5Value: "",        item5Label: "",
        item6Icon: "Award",  item6Value: "",        item6Label: "",
      } satisfies StatsBlockData,
    },
    {
      id: "preise-pricing",
      type: "pricing",
      data: {
        heading: "Unsere Tarife",
        subheading: "Alle Preise inkl. MwSt. · Monatlich kündbar. Keine Mindestlaufzeit.",
        visiblePlans: ["starter", "performance", "elite"],
      } satisfies PricingBlockData,
    },
    {
      id: "preise-features",
      type: "features-list",
      data: {
        heading: "In jeder Mitgliedschaft enthalten",
        subtitle: "Kein Kleingedrucktes – das bekommst du bei uns immer inklusive.",
        layout: "grid",
        features: [
          { icon: "Dumbbell", title: "Freie Gerätenutzung",       description: "Alle Geräte in der Athletic Area unbegrenzt nutzen – täglich von 05:00 bis 00:00 Uhr." },
          { icon: "Clock",    title: "Täglich 05:00 – 00:00 Uhr", description: "19 Stunden täglich, 7 Tage die Woche – auch an Wochenenden und Feiertagen." },
          { icon: "Users",    title: "Community",                  description: "Teil einer über 1.000 Mitglieder starken Fitness-Community in Göppingen." },
          { icon: "Shield",   title: "Keine Bindung",              description: "Monatlich kündbar – keine Mindestlaufzeit, keine versteckten Verträge." },
          { icon: "Wifi",     title: "Gratis WLAN",                description: "Schnelles WLAN im gesamten Studio für Streaming, Apps und Music." },
          { icon: "Heart",    title: "Kostenlose Einführung",      description: "Erste Studio-Tour und Geräte-Einweisung kostenfrei inklusive." },
        ],
      } satisfies FeaturesListBlockData,
    },
    {
      id: "preise-cta",
      type: "cta",
      data: {
        label: "Jetzt starten",
        headlineNormal: "KEIN BESSERER",
        headlineOutline: "ZEITPUNKT",
        subtitle: "Werde Mitglied im Nice Athletic Club und starte noch heute in dein Training. Keine Aufnahmegebühr, keine Bindung.",
        btn1Label: "Probetraining buchen",
        btn1Url: "/probetraining",
        btn2Label: "Tarife vergleichen",
        btn2Url: "#pakete",
      } satisfies CtaBlockData,
    },
  ],

  // ── Kurse ────────────────────────────────────────────────────────────────────
  kurse: [
    { id: "kurse-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "38 Kurse pro Woche · Alle Level", headlineLine1Normal: "UNSERE", headlineLine1Outline: "KURSE", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Von Kraft bis Ausdauer. CrossFit, Strength, Combat Fitness, Mobility und mehr – für jedes Fitnesslevel.", btn1Label: "Kursplan ansehen", btn1Url: "#kursplan", btn1Style: "primary", btn2Label: "Probetraining", btn2Url: "/probetraining", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "kurse-features", type: "features-list", data: { heading: "Von Kraft bis Ausdauer", subtitle: "Unser Kursangebot deckt alle Trainingsbereiche ab – egal ob du anfängst oder Wettkampfsport betreibst.", layout: "grid", features: [{ icon: "Zap", title: "CrossFit", description: "WODs, Olympic Lifting, Gymnastics & Conditioning – täglich neues Training." }, { icon: "Dumbbell", title: "Strength", description: "Progressives Krafttraining mit Barbells, Kettlebells und Freihanteln." }, { icon: "Shield", title: "HYROX Training", description: "Gezieltes Training für alle 8 HYROX-Stationen und die Competition." }, { icon: "Heart", title: "Combat Fitness", description: "Boxen, Kickboxen und funktionelles Kampfsport-Cardio." }, { icon: "Target", title: "Mobility & Stretching", description: "Gezielte Beweglichkeitsarbeit für bessere Performance und Verletzungsprävention." }, { icon: "Users", title: "Open Gym", description: "Freies Training zu festen Zeiten mit Coach-Betreuung nach Bedarf." }] } satisfies FeaturesListBlockData },
    { id: "kurse-timetable", type: "timetable", data: { heading: "Kursplan", subtitle: "Alle Kurse auf einen Blick – buche deinen Platz.", visibleCategories: ["crossfit", "strength", "hyrox", "combat", "mobility"] } satisfies TimetableBlockData },
    { id: "kurse-stats", type: "stats", data: { count: 3, item1Icon: "Calendar", item1Value: "38", item1Label: "Kurse pro Woche", item2Icon: "Users", item2Value: "10+", item2Label: "Zertifizierte Trainer", item3Icon: "Star", item3Value: "5", item3Label: "Kategorien", item4Icon: "Heart", item4Value: "", item4Label: "", item5Icon: "Heart", item5Value: "", item5Label: "", item6Icon: "Zap", item6Value: "", item6Label: "" } satisfies StatsBlockData },
    { id: "kurse-cta", type: "cta", data: { label: "Kurs starten", headlineNormal: "FINDE DEINEN", headlineOutline: "KURS", subtitle: "Komm zum Probetraining und erlebe unsere Kursvielfalt kostenlos und unverbindlich.", btn1Label: "Probetraining buchen", btn1Url: "/probetraining", btn2Label: "Mitglied werden", btn2Url: "/preise" } satisfies CtaBlockData },
  ],

  // ── Team-Seite ───────────────────────────────────────────────────────────────
  // 1:1 Spiegelbild von Team.tsx:
  //   TeamHeaderSection → team-header  (Desktop-Header + Mobile-Hero)
  //   TeamGridSection   → team-grid    (Desktop-Grid + Mobile-Carousel, API: /team.php?visible=1)
  team: [
    {
      id: "team-header",
      type: "team-header",
      data: {
        label: "Die Köpfe dahinter",
        headlineNormal: "UNSER",
        headlineOutline: "TEAM",
        subtitle: "Zertifiziert, erfahren, besessen von Ergebnissen. Klick auf einen Trainer für sein vollständiges Profil.",
        subtitleMobile: "Zertifiziert, erfahren, besessen von Ergebnissen. Tippe auf einen Trainer für das vollständige Profil.",
        stat1Val: "10+",  stat1Label: "Trainer",
        stat2Val: "100%", stat2Label: "Zertifiziert",
        stat3Val: "∞",    stat3Label: "Leidenschaft",
        ctaLabel: "PROBETRAINING VEREINBAREN",
        ctaUrl: "/probetraining",
      } satisfies TeamHeaderBlockData,
    },
    {
      id: "team-grid",
      type: "team-grid",
      data: {
        heading: "Unser Team",
        apiEndpoint: "/team.php?visible=1",
        desktopCols: 3,
        leadershipSectionLabel: "GESCHÄFTSFÜHRUNG",
        leadershipHeadlineNormal: "DIE",
        leadershipHeadlineOutline: "GRÜNDER",
        coachesSectionLabel: "COACHING TEAM",
        coachesHeadlineNormal: "DEINE",
        coachesHeadlineOutline: "TRAINER",
        coachesSubtitle: "Swipe durch unser Team und tippe für das volle Profil.",
        mobileCTABadge: "WERDE TEIL DES TEAMS",
        mobileCTAHeadline: "",
        mobileCTABtnLabel: "JETZT BEWERBEN!",
        mobileCTABtnUrl: "/karriere",
      } satisfies TeamGridBlockData,
    },
  ],

  // ── Kontakt ──────────────────────────────────────────────────────────────────
  kontakt: [
    { id: "kontakt-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Wir sind für dich da", headlineLine1Normal: "KONTAKT", headlineLine1Outline: "", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Frag uns alles – Mitgliedschaft, Probetraining, Personal Training oder einfach Hallo.", btn1Label: "", btn1Url: "", btn1Style: "ghost", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "kontakt-hours", type: "opening-hours", data: { heading: "Wann du uns erreichst", note: "Persönlich an der Theke oder per E-Mail jederzeit.", rows: [{ days: "Mo – Fr", hours: "08:30 – 21:30 Uhr", highlight: true }, { days: "Sa – So", hours: "09:30 – 14:30 Uhr", highlight: false }] } satisfies OpeningHoursBlockData },
    { id: "kontakt-form", type: "contact-form", data: { heading: "Kontaktiere uns", subtitle: "Wir melden uns innerhalb von 24 Stunden.", buttonText: "Nachricht senden", recipientEmail: "info@nice-fitness.de" } satisfies ContactFormBlockData },
  ],

  // ── Probetraining ────────────────────────────────────────────────────────────
  probetraining: [
    { id: "probe-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Kostenlos & unverbindlich", headlineLine1Normal: "DEIN ERSTES", headlineLine1Outline: "TRAINING", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Kostenlos. Unverbindlich. Unvergesslich. Erlebe den Nice Athletic Club hautnah.", btn1Label: "Jetzt anmelden", btn1Url: "#form", btn1Style: "primary", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "probe-features", type: "features-list", data: { heading: "Was dich erwartet", subtitle: "Dein erstes Training bei uns – wir machen es unvergesslich.", layout: "grid", features: [{ icon: "Users", title: "Persönliche Begrüßung", description: "Ein Coach empfängt dich und zeigt dir das gesamte Studio." }, { icon: "Dumbbell", title: "Freies Training", description: "Teste alle Bereiche – Athletic Area, CrossFit Zone und HYROX." }, { icon: "Target", title: "Individuelle Beratung", description: "Wir besprechen deine Ziele und empfehlen den richtigen Trainingsplan." }, { icon: "Heart", title: "Keine Verpflichtung", description: "Völlig kostenlos – du entscheidest danach, ob du Mitglied wirst." }] } satisfies FeaturesListBlockData },
    { id: "probe-form", type: "contact-form", data: { heading: "Probetraining anfragen", subtitle: "Wir melden uns innerhalb von 24 Stunden und vereinbaren einen Termin.", buttonText: "Jetzt anfragen", recipientEmail: "info@nice-fitness.de" } satisfies ContactFormBlockData },
    { id: "probe-cta", type: "cta", data: { label: "Werde Mitglied", headlineNormal: "DEINE STORY BEGINNT", headlineOutline: "HIER", subtitle: "Nach dem Probetraining direkt Mitglied werden – monatlich kündbar, keine Aufnahmegebühr.", btn1Label: "Preise ansehen", btn1Url: "/preise", btn2Label: "", btn2Url: "" } satisfies CtaBlockData },
  ],

  // ── Über uns  /ueber-uns ─────────────────────────────────────────────────────
  "ueber-uns": [
    { id: "ueber-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Unsere Geschichte", headlineLine1Normal: "ÜBER", headlineLine1Outline: "UNS", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Wir sind mehr als ein Gym – wir sind eine Gemeinschaft.", btn1Label: "Unser Team", btn1Url: "/team", btn1Style: "ghost", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "ueber-values", type: "values-grid", data: { heading: "Unsere Werte", subtitle: "Was uns antreibt und was wir jeden Tag aufs Neue leben.", values: [{ icon: "Heart", title: "Community", description: "Wir leben Community – Stillstand ist Rückschritt." }, { icon: "Target", title: "Zielfokus", description: "Jedes Mitglied hat ein Ziel. Wir helfen es zu erreichen." }, { icon: "Award", title: "Qualität", description: "Premium Equipment, zertifizierte Trainer, saubere Anlagen." }, { icon: "Zap", title: "Innovation", description: "Neue Zonen, neue Kurse, immer am Puls der Zeit." }] } satisfies ValuesGridBlockData },
    { id: "ueber-stats", type: "stats", data: { count: 4, item1Icon: "Users", item1Value: "1.000+", item1Label: "Aktive Mitglieder", item2Icon: "Award", item2Value: "10", item2Label: "Zertifizierte Trainer", item3Icon: "Dumbbell", item3Value: "1.500", item3Label: "qm Trainingsfläche", item4Icon: "Star", item4Value: "4,9/5", item4Label: "Google-Bewertung", item5Icon: "Heart", item5Value: "", item5Label: "", item6Icon: "Zap", item6Value: "", item6Label: "" } satisfies StatsBlockData },
    { id: "ueber-cta", type: "cta", data: { label: "Werde Teil von NICE", headlineNormal: "DEINE STORY", headlineOutline: "BEGINNT HIER", subtitle: "Komm zu uns, trainiere mit Leidenschaft und werde Teil unserer Community.", btn1Label: "Probetraining buchen", btn1Url: "/probetraining", btn2Label: "Unser Team", btn2Url: "/team" } satisfies CtaBlockData },
  ],

  // ── Personal Training  /personal-training ────────────────────────────────────
  "personal-training": [
    { id: "pt-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "1:1 Coaching", headlineLine1Normal: "PERSONAL", headlineLine1Outline: "TRAINING", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Maximale Ergebnisse mit personalisiertem 1:1 Coaching von zertifizierten Trainern.", btn1Label: "PT anfragen", btn1Url: "/kontakt", btn1Style: "primary", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "pt-features", type: "features-list", data: { heading: "Was dich erwartet", subtitle: "Individuell. Professionell. Wirkungsvoll.", layout: "grid", features: [{ icon: "Target", title: "Individueller Trainingsplan", description: "Auf dein Ziel und deine Fähigkeiten zugeschnitten." }, { icon: "Users", title: "1:1 Betreuung", description: "Persönlicher Coach, der dich durch jede Einheit führt." }, { icon: "Award", title: "Ernährungsberatung", description: "Optimale Nährstoffversorgung für dein Training." }, { icon: "Zap", title: "Fortschrittstracking", description: "Mess- und auswertbare Erfolge in kurzer Zeit." }, { icon: "Shield", title: "Verletzungsprävention", description: "Korrekte Technik und gezielte Mobilitätsarbeit." }, { icon: "Heart", title: "Motivation & Accountability", description: "Wir halten dich auf Kurs – auch wenn's mal schwer wird." }] } satisfies FeaturesListBlockData },
    { id: "pt-values", type: "values-grid", data: { heading: "Unsere Trainer", subtitle: "Alle Personal Trainer sind staatlich geprüft und zertifiziert.", values: [{ icon: "Award", title: "Zertifiziert", description: "Staatlich anerkannte Ausbildung und regelmäßige Weiterbildungen." }, { icon: "Heart", title: "Leidenschaft", description: "Echte Passion für Sport und die Erfolge unserer Mitglieder." }, { icon: "Target", title: "Ergebnisorientiert", description: "Messbare Fortschritte in kurzer Zeit – das ist unser Anspruch." }] } satisfies ValuesGridBlockData },
    { id: "pt-cta", type: "cta", data: { label: "PT anfragen", headlineNormal: "DEIN PERSÖNLICHER", headlineOutline: "COACH WARTET", subtitle: "Mach den ersten Schritt – ein unverbindliches Erstgespräch reicht.", btn1Label: "Personal Trainer anfragen", btn1Url: "/kontakt", btn2Label: "", btn2Url: "" } satisfies CtaBlockData },
  ],

  // ── CrossFit GP  /crossfit-gp ────────────────────────────────────────────────
  "crossfit-gp": [
    { id: "cf-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "CrossFit Göppingen", headlineLine1Normal: "CROSSFIT", headlineLine1Outline: "GÖPPINGEN", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "WODs, Olympic Lifting, Gymnastics & Conditioning – alles in einer Community.", btn1Label: "Kursplan ansehen", btn1Url: "/kurse", btn1Style: "primary", btn2Label: "Probetraining", btn2Url: "/probetraining", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "cf-features", type: "features-list", data: { heading: "Was CrossFit ausmacht", subtitle: "Constant, varied, functional movement at high intensity.", layout: "grid", features: [{ icon: "Zap", title: "WOD", description: "Täglich wechselnde Workouts – nie langweilig, immer effektiv." }, { icon: "Users", title: "Community", description: "Trainiere mit und gegen Gleichgesinnte." }, { icon: "Award", title: "Coaches", description: "Erfahrene CrossFit-L1 & L2 Coaches begleiten jedes Training." }, { icon: "Target", title: "Skalierbar", description: "Jeder WOD kann auf dein Level angepasst werden." }, { icon: "Dumbbell", title: "Olympic Lifting", description: "Snatch, Clean & Jerk auf einer echten Weightlifting-Plattform." }, { icon: "Heart", title: "Funktionell", description: "Bewegungen aus dem Alltag – optimiert für maximale Leistung." }] } satisfies FeaturesListBlockData },
    { id: "cf-timetable", type: "timetable", data: { heading: "CrossFit Kursplan", subtitle: "Finde deinen nächsten WOD.", visibleCategories: ["crossfit"] } satisfies TimetableBlockData },
    { id: "cf-gallery", type: "image-gallery", data: { heading: "Unsere CrossFit Zone", layout: "grid", imageUrls: "", columns: 3 } satisfies ImageGalleryBlockData },
    { id: "cf-cta", type: "cta", data: { label: "CrossFit starten", headlineNormal: "BEREIT FÜR DEN", headlineOutline: "ERSTEN WOD?", subtitle: "Komm zum Probetraining und erlebe, was CrossFit wirklich ist.", btn1Label: "Probetraining buchen", btn1Url: "/probetraining", btn2Label: "", btn2Url: "" } satisfies CtaBlockData },
  ],

  // ── Firmenfitness  /firmenfitness ────────────────────────────────────────────
  firmenfitness: [
    { id: "firma-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Corporate Fitness", headlineLine1Normal: "FIRMEN", headlineLine1Outline: "FITNESS", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Gesunde Mitarbeiter. Mehr Produktivität. Starke Teams.", btn1Label: "Angebot anfragen", btn1Url: "/kontakt", btn1Style: "primary", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "firma-features", type: "features-list", data: { heading: "Unsere Firmenpakete", subtitle: "Maßgeschneiderte Lösungen für Unternehmen jeder Größe.", layout: "grid", features: [{ icon: "Users", title: "Gruppenmitgliedschaften", description: "Rabattierte Mitgliedschaften für dein gesamtes Team." }, { icon: "Award", title: "Firmenkurse", description: "Exklusive Kurse für deine Belegschaft." }, { icon: "TrendingUp", title: "Steuerlich absetzbar", description: "§ 3 Nr. 34 EStG – bis 600 €/Jahr steuerfrei." }, { icon: "Target", title: "Team-Events", description: "Teambuilding-Events und gemeinsame Herausforderungen." }, { icon: "Shield", title: "Flexibilität", description: "Keine Mindestlaufzeiten, einfache Verwaltung." }, { icon: "Heart", title: "Betriebliches Wohlbefinden", description: "Reduziere Krankentage und steigere die Mitarbeiterzufriedenheit." }] } satisfies FeaturesListBlockData },
    { id: "firma-values", type: "values-grid", data: { heading: "Warum Firmenfitness bei NICE?", subtitle: "Echte Ergebnisse für Unternehmen und ihre Mitarbeiter.", values: [{ icon: "TrendingUp", title: "Weniger Fehlzeiten", description: "Regelmäßiges Training reduziert Krankentage nachweislich." }, { icon: "Zap", title: "Mehr Produktivität", description: "Sport fördert Konzentration, Kreativität und Belastbarkeit." }, { icon: "Users", title: "Stärkerer Teamgeist", description: "Gemeinsames Training verbindet und motiviert." }] } satisfies ValuesGridBlockData },
    { id: "firma-form", type: "contact-form", data: { heading: "Jetzt Firmenangebot anfragen", subtitle: "Teile uns deine Unternehmensgröße und Wünsche mit.", buttonText: "Angebot anfragen", recipientEmail: "corporate@nice-fitness.de" } satisfies ContactFormBlockData },
    { id: "firma-cta", type: "cta", data: { label: "Firmenfitness", headlineNormal: "INVESTIERE IN DEIN", headlineOutline: "TEAM", subtitle: "Gesunde Mitarbeiter sind das wertvollste Kapital eines Unternehmens.", btn1Label: "Jetzt anfragen", btn1Url: "/kontakt", btn2Label: "", btn2Url: "" } satisfies CtaBlockData },
  ],

  // ── Athletic Area  /athletic-area ────────────────────────────────────────────
  "athletic-area": [
    { id: "aa-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Bodybuilding · Powerlifting · Olympic Lifting", headlineLine1Normal: "ATHLETIC", headlineLine1Outline: "AREA", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Premium Equipment auf 800 m². Eleiko, Technogym, Gymleco – das Beste auf dem Markt.", btn1Label: "Mitglied werden", btn1Url: "/preise", btn1Style: "primary", btn2Label: "Probetraining", btn2Url: "/probetraining", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "aa-features", type: "features-list", data: { heading: "Unsere Ausstattung", subtitle: "Professionelles Equipment für jedes Trainingsziel.", layout: "grid", features: [{ icon: "Dumbbell", title: "Power Racks", description: "4 vollausgestattete Power Racks mit Eleiko-Stangen." }, { icon: "Target", title: "80+ Maschinen", description: "Technogym, Gymleco und Body Masters." }, { icon: "Award", title: "Freie Gewichte", description: "Hanteln bis 100 kg, SZ-Stangen, Trap Bar und mehr." }, { icon: "Zap", title: "Kabel-Maschinen", description: "Functional Trainer, Cable Crossover und Seilzugsysteme." }, { icon: "Shield", title: "Lifting Platform", description: "Dedizierte Plattform für Olympic Weightlifting." }, { icon: "Users", title: "Cardio Zone", description: "Laufbänder, Bikes und Rowing-Ergometer." }] } satisfies FeaturesListBlockData },
    { id: "aa-gallery", type: "image-gallery", data: { heading: "Einblick in die Athletic Area", layout: "masonry", imageUrls: "", columns: 3 } satisfies ImageGalleryBlockData },
    { id: "aa-pricing", type: "pricing-cards", data: { heading: "Dein Tarif für die Athletic Area", selectedPlans: ["athletic", "nicest"] } satisfies PricingCardsBlockData },
    { id: "aa-cta", type: "cta", data: { label: "Athletic Area", headlineNormal: "TRAINIERE WIE DIE", headlineOutline: "PROS", subtitle: "Premium Equipment, zertifizierte Coaches, echte Ergebnisse.", btn1Label: "Mitglied werden", btn1Url: "/preise", btn2Label: "Probetraining", btn2Url: "/probetraining" } satisfies CtaBlockData },
  ],

  // ── HYROX Zone  /hyrox ───────────────────────────────────────────────────────
  hyrox: [
    { id: "hyrox-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Offizieller HYROX Training Club", headlineLine1Normal: "HYROX", headlineLine1Outline: "ZONE", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "8 Stationen. SkiErg. Sled Push. Wall Balls. Burpee Broad Jumps. Farmers Carry. Echte Competition.", btn1Label: "Training starten", btn1Url: "/probetraining", btn1Style: "primary", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "hyrox-features", type: "features-list", data: { heading: "HYROX Stationen bei NICE", subtitle: "Alle 8 offiziellen HYROX-Stationen auf wettkampfnahem Setup.", layout: "grid", features: [{ icon: "Zap", title: "SkiErg", description: "Ausdauer und Oberkörperkraft kombiniert." }, { icon: "Shield", title: "Sled Push & Pull", description: "Wettkampfnaher Schlitten für Power und Ausdauer." }, { icon: "Users", title: "Burpee Broad Jump", description: "Explosivität und Ganzkörperkoordination." }, { icon: "Target", title: "Rowing", description: "Concept2 Rowing Ergometer für Ausdauerarbeit." }, { icon: "Dumbbell", title: "Farmers Carry", description: "Griffkraft, Kern und Ausdauer in einem." }, { icon: "Heart", title: "Wall Balls", description: "20 lb Ball, 9 Fuß – der Klassiker schlechthin." }] } satisfies FeaturesListBlockData },
    { id: "hyrox-gallery", type: "image-gallery", data: { heading: "Die HYROX Zone", layout: "grid", imageUrls: "", columns: 3 } satisfies ImageGalleryBlockData },
    { id: "hyrox-cta", type: "cta", data: { label: "HYROX Training", headlineNormal: "RACE DAY STARTS AT", headlineOutline: "NICE", subtitle: "Ob Rookie, Semi-Pro oder Elite – wir trainieren dich auf dein nächstes Rennen.", btn1Label: "Probetraining buchen", btn1Url: "/probetraining", btn2Label: "", btn2Url: "" } satisfies CtaBlockData },
  ],

  // ── Nice Theke  /nice-theke ──────────────────────────────────────────────────
  "nice-theke": [
    { id: "theke-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Espresso · Shakes · Community", headlineLine1Normal: "DIE NICE", headlineLine1Outline: "THEKE", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Mehr als ein Tresen – dein Treffpunkt vor und nach dem Training.", btn1Label: "Studio entdecken", btn1Url: "/studio", btn1Style: "ghost", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "theke-text", type: "rich-text", data: { heading: "Unser Angebot", content: "Frischer Espresso aus der Siebträgermaschine, cremige Proteinshakes, Smoothies, Protein Bars und Clear Whey – alles für die perfekte Pre- oder Post-Workout-Ernährung.", centered: true } satisfies RichTextBlockData },
    { id: "theke-gallery", type: "image-gallery", data: { heading: "Einblick in die Theke", layout: "grid", imageUrls: "", columns: 3 } satisfies ImageGalleryBlockData },
    { id: "theke-hours", type: "opening-hours", data: { heading: "Thekenzeiten", note: "Warme Getränke und Shakes sind zu den Thekenzeiten verfügbar.", rows: [{ days: "Mo – Fr", hours: "08:30 – 21:30 Uhr", highlight: true }, { days: "Sa – So", hours: "09:30 – 14:30 Uhr", highlight: false }] } satisfies OpeningHoursBlockData },
    { id: "theke-cta", type: "cta", data: { label: "Werde Mitglied", headlineNormal: "TRAINING TRIFFT", headlineOutline: "GENUSS", subtitle: "Genieße deinen Post-Workout-Shake mit der besten Community in Göppingen.", btn1Label: "Mitglied werden", btn1Url: "/preise", btn2Label: "", btn2Url: "" } satisfies CtaBlockData },
  ],

  // ── Karriere  /karriere ──────────────────────────────────────────────────────
  karriere: [
    { id: "karriere-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Join our Team", headlineLine1Normal: "KARRIERE", headlineLine1Outline: "BEI NICE", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Werde Teil unseres Teams und arbeite in einem der besten Gyms in der Region.", btn1Label: "Offene Stellen", btn1Url: "#jobs", btn1Style: "primary", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "karriere-values", type: "values-grid", data: { heading: "Warum bei NICE arbeiten?", subtitle: "Wir bieten mehr als nur einen Job.", values: [{ icon: "Heart", title: "Leidenschaft", description: "Arbeite in einem Umfeld, das du liebst." }, { icon: "Award", title: "Weiterentwicklung", description: "Fortbildungen, Zertifikate und Coaching-Sessions." }, { icon: "Users", title: "Community", description: "Ein starkes Team, das zusammenhält." }, { icon: "TrendingUp", title: "Faire Vergütung", description: "Wettbewerbsfähige Gehälter und flexible Arbeitszeitmodelle." }] } satisfies ValuesGridBlockData },
    { id: "karriere-jobs", type: "jobs-board", data: { heading: "Offene Stellen", subtitle: "Finde deine Traumstelle bei NICE.", apiDriven: true, applyEmail: "karriere@nice-fitness.de" } satisfies JobsBoardBlockData },
    { id: "karriere-cta", type: "cta", data: { label: "Karriere", headlineNormal: "WERDE TEIL DES", headlineOutline: "NICE TEAMS", subtitle: "Keine passende Stelle? Bewirb dich initiativ – wir freuen uns auf dich.", btn1Label: "Initiativ bewerben", btn1Url: "/kontakt", btn2Label: "", btn2Url: "" } satisfies CtaBlockData },
  ],

  // ── Presse  /presse ───────────────────────────────────────────────────────────
  presse: [
    { id: "presse-hero", type: "hero", data: { mediaType: "image", mediaUrl: "", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Medien & Presse", headlineLine1Normal: "PRESSE", headlineLine1Outline: "", headlineLine2Normal: "", headlineLine2Outline: "", subtitle: "Pressemitteilungen, Medienkit und Ansprechpartner für Journalisten.", btn1Label: "", btn1Url: "", btn1Style: "ghost", btn2Label: "", btn2Url: "", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "presse-text", type: "rich-text", data: { heading: "Für die Presse", content: "Nice Athletic Club Göppingen – Göppingens führendes Premium-Fitnessstudio. Für Presseanfragen und Medienpartnerschaften steht unser Team gerne zur Verfügung.", centered: false } satisfies RichTextBlockData },
    { id: "presse-contact", type: "contact-form", data: { heading: "Presseanfrage stellen", subtitle: "Wir melden uns innerhalb von 24 Stunden.", buttonText: "Anfrage senden", recipientEmail: "presse@nice-fitness.de" } satisfies ContactFormBlockData },
  ],

  // ── Impressum  /impressum ────────────────────────────────────────────────────
  impressum: [
    { id: "impressum-content", type: "legal-content", data: { heading: "Impressum", pageType: "impressum", content: "Angaben gemäß § 5 TMG\n\nNice Athletic Club Göppingen\nRobert-Bosch-Straße 5\n73037 Göppingen\n\nE-Mail: info@nice-fitness.de" } satisfies LegalContentBlockData },
  ],

  // ── Datenschutz  /datenschutz ────────────────────────────────────────────────
  datenschutz: [
    { id: "datenschutz-content", type: "legal-content", data: { heading: "Datenschutzerklärung", pageType: "datenschutz", content: "Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten auf." } satisfies LegalContentBlockData },
  ],

  // ── AGB  /agb ────────────────────────────────────────────────────────────────
  agb: [
    { id: "agb-content", type: "legal-content", data: { heading: "Allgemeine Geschäftsbedingungen", pageType: "agb", content: "§ 1 Geltungsbereich\nDiese AGB gelten für alle Verträge zwischen dem Nice Athletic Club Göppingen und seinen Mitgliedern." } satisfies LegalContentBlockData },
  ],

  // ── EGYM Wellpass  /egym-wellpass ─────────────────────────────────────────────
  "egym-wellpass": [
    { id: "wp-hero",       type: "hero",          data: { mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1768039376161-2e7307d470d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080", videoLoop: false, videoMuted: true, videoStartTime: 0, videoEndTime: 0, label: "Offizieller Wellpass-Partner Göppingen", headlineLine1Normal: "EGYM", headlineLine1Outline: "WELLPASS", headlineLine2Normal: "IM NICE", headlineLine2Outline: "NUTZEN.", subtitle: "Du hast EGYM Wellpass über deinen Arbeitgeber? Kein Zusatzvertrag, kein Aufwand – einfach einchecken und trainieren.", btn1Label: "Wellpass App öffnen", btn1Url: "https://de.egym-wellpass.com", btn1Style: "primary", btn2Label: "Fragen? Kontakt", btn2Url: "/kontakt", btn2Style: "ghost" } satisfies HeroBlockData },
    { id: "wp-stats",      type: "stats",         data: { count: 4, mobileLayout: "grid-2", item1Icon: "Globe", item1Value: "10.000+", item1Label: "Partner-Studios DE", item2Icon: "Zap", item2Value: "∞", item2Label: "Besuche (L/XL)", item3Icon: "Shield", item3Value: "0 €", item3Label: "Kein Zusatzvertrag", item4Icon: "Star", item4Value: "4,9 ★", item4Label: "Bewertung", item5Icon: "Heart", item5Value: "", item5Label: "", item6Icon: "Zap", item6Value: "", item6Label: "" } satisfies StatsBlockData },
    { id: "wp-what",       type: "features-list", data: { heading: "Was ist EGYM Wellpass?", subtitle: "Das führende Corporate-Fitness-Netzwerk – eine App für tausende Studios in ganz Deutschland.", layout: "grid", mobileLayout: "stack", features: [{ icon: "Briefcase", title: "Über den Arbeitgeber buchbar", description: "Dein Unternehmen bucht Wellpass als steuerfreien Benefit – bis zu 600 €/MA/Jahr steuerfrei (§ 3 Nr. 34 EStG)." }, { icon: "MapPin", title: "Deutschlandweit nutzbar", description: "Über 10.000 Partner-Studios, Schwimmbäder und Yoga-Studios in DE, AT und CH." }, { icon: "Zap", title: "Eine App – alles inklusive", description: "Check-in bei jedem Partner-Studio über eine App. Keine Karten, keine Schlüssel." }, { icon: "Shield", title: "Auch auf Dienstreise", description: "Bundesweit trainieren – ob Zuhause in Göppingen, auf Dienstreise oder im Urlaub." }] } satisfies FeaturesListBlockData },
    { id: "wp-how",        type: "values-grid",   data: { heading: "So nutzt du Wellpass bei uns.", subtitle: "In 4 einfachen Schritten zum Training im Nice Athletic Club.", mobileLayout: "stack", values: [{ icon: "Briefcase", title: "01 – Arbeitgeber aktiviert", description: "Dein Unternehmen schließt einen Rahmenvertrag mit EGYM Wellpass ab – vollständig digital." }, { icon: "Zap", title: "02 – App herunterladen", description: "EGYM Wellpass App (iOS/Android) installieren und mit Firmen-E-Mail registrieren." }, { icon: "MapPin", title: "03 – Nice Athletic Club", description: "In der App nach 'Nice Athletic Club Göppingen' suchen – wir sind offiziell gelistet." }, { icon: "Star", title: "04 – Sofort loslegen", description: "Check-in per App am Empfang und trainiere los. Voller Zugang zu allen Bereichen." }] } satisfies ValuesGridBlockData },
    { id: "wp-facilities", type: "features-list", data: { heading: "Alles inklusive – kein Kompromiss.", subtitle: "Premium Training auf über 2.500 m² in Göppingen. Zugang je nach Wellpass-Kontingent.", layout: "grid", mobileLayout: "stack", features: [{ icon: "Dumbbell", title: "Gerätetraining & Freifläche", description: "Premium Kraft- und Cardiogeräte auf 800 m². Vollständig inklusive bei allen Kontingenten." }, { icon: "Target", title: "HYROX Zone", description: "SkiErg, Ruderergometer, Sled & Farmers Carry für HYROX-Training." }, { icon: "Users", title: "Gruppenkurse & Yoga", description: "Über 20 Kurse pro Woche: Yoga, HIIT, Bootcamp, Mobility – mit qualifizierten Trainern." }, { icon: "Heart", title: "Sauna & Wellness", description: "Finn-Sauna, Dampfbad und Relaxzone. Ab Kontingent L/XL inklusive." }, { icon: "Award", title: "CrossFit GP", description: "Unsere CrossFit Box mit Rig, Barbells und Kettlebells. Je nach Kontingent." }, { icon: "Shield", title: "Kostenfreie Parkplätze", description: "Direkt vor dem Eingang. 5 Minuten vom Göppinger Zentrum entfernt." }] } satisfies FeaturesListBlockData },
    { id: "wp-plans",      type: "trust-badges",  data: { heading: "Wellpass Kontingente im Überblick", badges: [{ icon: "Shield", text: "Wellpass S – 4 Besuche/Monat – Gerätebereich & Freifläche" }, { icon: "Zap", text: "Wellpass M – 8 Besuche/Monat – Geräte + 1 Kursbesuch" }, { icon: "Star", text: "Wellpass L – Unlimitiert – Alle Kurse + Sauna & Wellness" }, { icon: "Award", text: "Wellpass XL – Unlimitiert+ – CrossFit + alle Premium-Partner" }] } satisfies TrustBadgesBlockData },
    { id: "wp-faq",        type: "faq",           data: { heading: "Häufige Fragen – Wellpass beim Nice Athletic Club", questions: [{ question: "Ist der Nice Athletic Club ein offizieller EGYM Wellpass Partner?", answer: "Ja! Wir sind ein verifizierter EGYM Wellpass Partner. Du findest uns direkt in der Wellpass App unter 'Göppingen'." }, { question: "Welche Bereiche kann ich mit Wellpass nutzen?", answer: "Je nach Kontingent (S/M/L/XL) hast du Zugang zu Gerätebereich, HYROX Zone, Gruppenkursen und Sauna. Details in der Wellpass App." }, { question: "Brauche ich einen zusätzlichen Mitgliedsvertrag?", answer: "Nein! Dein aktives EGYM Wellpass Abonnement berechtigt dich vollständig. Kein separater Vertrag nötig." }, { question: "Wie viele Besuche sind pro Monat möglich?", answer: "S = 4/Monat, M = 8/Monat, L & XL = unlimitiert. Wir empfehlen Kontingent L oder XL für unbegrenztes Training." }, { question: "Mein Arbeitgeber bietet Wellpass noch nicht an – was tun?", answer: "Sprich deine HR-Abteilung an! Bis 600 €/MA/Jahr steuerfrei (§ 3 Nr. 34 EStG). Bis dahin: Mitgliedschaft ab 39 €/Monat." }, { question: "Zu welchen Zeiten kann ich trainieren?", answer: "Täglich 05:00–00:00 Uhr – auch an Wochenenden und Feiertagen. Als Wellpass-Mitglied gelten dieselben Öffnungszeiten wie für reguläre Mitglieder." }] } satisfies FaqBlockData },
    { id: "wp-location",   type: "location-map",  data: { heading: "Nice Athletic Club – Göppingen", address: "Robert-Bosch-Straße 5, 73037 Göppingen", googleMapsUrl: "https://maps.google.com/?q=Nice+Athletic+Club+Göppingen", googleMapsEmbedUrl: "", phone: "+49 7161 9163663", email: "info@nice-fitness.de", showOpeningHours: true } satisfies LocationMapBlockData },
    { id: "wp-cta",        type: "cta",           data: { label: "Jetzt loslegen", headlineNormal: "WELLPASS?", headlineOutline: "NICE.", subtitle: "Hast du EGYM Wellpass über deinen Arbeitgeber? Dann check dich ein und trainiere noch heute im Nice Athletic Club Göppingen.", btn1Label: "Wellpass App öffnen", btn1Url: "https://de.egym-wellpass.com", btn2Label: "Kostenloses Probetraining", btn2Url: "/probetraining" } satisfies CtaBlockData },
  ],
};

// ── Utility ───────────────────────────────────────────────────────────────────

export function generateBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createBlock(type: BlockType): PageBlock {
  return {
    id: generateBlockId(),
    type,
    data: { ...BLOCK_REGISTRY[type].defaultData },
  };
}

export function migrateLegacyBlocks(blocks: PageBlock[]): PageBlock[] {
  const result: PageBlock[] = [];
  for (const block of blocks) {
    if (block.type === "pricing") {
      const data = block.data as PricingBlockData;
      result.push({
        id: block.id + "-cards",
        type: "pricing-cards",
        hidden: block.hidden,
        data: {
          heading: data.heading || "Unsere Tarife",
          subheading: data.subheading || "",
          selectedPlans: data.visiblePlans && data.visiblePlans.length > 0 ? data.visiblePlans : ["all"],
        }
      });
      result.push({
        id: block.id + "-addons",
        type: "pricing-addons",
        hidden: block.hidden,
        data: {
          heading: "Add-Ons",
          subtitle: "Zusatzoptionen",
        }
      });
      result.push({
        id: block.id + "-compare",
        type: "pricing-compare",
        hidden: block.hidden,
        data: {
          heading: "Tarifvergleich",
        }
      });
    } else {
      result.push(block);
    }
  }
  return result;
}

export { MEMBERSHIP_PLANS };

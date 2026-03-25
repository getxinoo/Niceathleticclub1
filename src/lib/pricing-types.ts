/**
 * pricing-types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types für die Public Pricing API: GET /api/public/pricing.php?page={slug}
 * Alle Daten sind seitenspezifisch – das Backend liefert nur sichtbare Pläne.
 */

// ── Page Slugs ───────────────────────────────────────────────────────────────
export type PricingPageSlug =
  | "preise"
  | "startseite"
  | "firmenfitness"
  | "personal-training";

// ── Plan (seitenspezifisch aufgelöst) ────────────────────────────────────────
export interface PublicPlan {
  id: number;
  slug: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  badge_text: string | null;
  is_featured: boolean;
  show_cta: boolean;
  cta_text: string;
  cta_url: string;
  restrictions: string | null;
  blaulicht_discount: number | null;
  student_price: number | null;
  sort_order: number;
}

// ── Add-on ───────────────────────────────────────────────────────────────────
export interface PublicAddonOption {
  label: string;
  price: number;
}

export interface PublicAddon {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  options: PublicAddonOption[];
  sort_order: number;
}

// ── Hinweisblock ─────────────────────────────────────────────────────────────
export interface PublicNotice {
  id: number;
  type: "contract" | "blaulicht" | "info" | "warning";
  title: string;
  text: string;
  sort_order: number;
}

// ── Vergleichstabelle ────────────────────────────────────────────────────────
export interface ComparisonColumn {
  plan_slug: string;
  plan_name: string;
  price: string;
  is_featured: boolean;
  badge_text: string | null;
}

export interface ComparisonRow {
  feature: string;
  values: Record<string, boolean | string>;
}

export interface ComparisonModule {
  enabled: boolean;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

// ── Vor-/Nachteile ──────────────────────────────────────────────────────────
export interface ProsConsEntry {
  plan_slug: string;
  plan_name: string;
  price: string;
  is_featured: boolean;
  pros: string[];
  cons: string[];
}

export interface ProsConsModule {
  enabled: boolean;
  entries: ProsConsEntry[];
}

// ── Gesamte API-Response ─────────────────────────────────────────────────────
export interface PublicPricingResponse {
  page: PricingPageSlug;
  plans: PublicPlan[];
  addons: PublicAddon[];
  notices: PublicNotice[];
  comparison: ComparisonModule | null;
  pros_cons: ProsConsModule | null;
}

// ── Admin: Seitenausspielung pro Plan ────────────────────────────────────────
export interface PageOverride {
  page_slug: PricingPageSlug;
  is_visible: boolean;
  is_featured: boolean;
  show_cta: boolean;
  badge_text: string;
  description_override: string;
  features_override: string;
  sort_order: number;
}

export interface AdminPlan {
  id: number | null;
  slug: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta_text: string;
  cta_url: string;
  restrictions: string;
  blaulicht_discount: number | null;
  student_price: number | null;
  sort_order: number;
  page_overrides: PageOverride[];
}

export const PAGE_SLUG_LABELS: Record<PricingPageSlug, string> = {
  preise: "Preise-Seite",
  startseite: "Startseite",
  firmenfitness: "Firmenfitness",
  "personal-training": "Personal Training",
};

export const ALL_PAGE_SLUGS: PricingPageSlug[] = [
  "preise",
  "startseite",
  "firmenfitness",
  "personal-training",
];

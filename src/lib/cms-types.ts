/**
 * cms-types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Forward-looking, additive type definitions for the CMS Builder work
 * (card/box items, grid layout settings, navigation settings).
 *
 * Status: types only. Nothing in the app reads or writes these fields yet —
 * they are not wired into BLOCK_REGISTRY, PageBlock instances, or any
 * renderer. Adding them here is non-breaking (pure TypeScript, additive) and
 * establishes the shared vocabulary for the next implementation tickets:
 *   • generic card/box editor UI (BlockSettingsSheet)
 *   • per-block grid/layout controls
 *   • admin navigation manager (extends the existing page_visibility API)
 *
 * Do not infer that any of this is live — see the architecture report for
 * what is and isn't wired up today.
 */

import type { PageLink } from "./links";

// ── Card / Box item ────────────────────────────────────────────────────────
// One repeatable card/box inside a grid-style block (add-ons, pricing cards,
// team, features, jobs, gallery, ...). Mirrors the fields listed in the task:
// title, kicker, description, icon, image, video, rows/options, price/label,
// button, link, visibility, sort order, layout preset, footer text.
export interface CardItemOption {
  label: string;
  price?: number;
}

export interface CardItem {
  id: string;
  title: string;
  kicker?: string;
  description?: string;
  icon?: string;
  image?: string;
  video?: string;
  /** Repeatable rows/options, e.g. pricing add-on tiers ("1x pro Woche" → 20€). */
  rows?: CardItemOption[];
  /** Simple price/label pair for cards that show a single price, not rows. */
  price?: number;
  priceLabel?: string;
  buttonLabel?: string;
  link?: PageLink;
  visible: boolean;
  sortOrder: number;
  /** Named column-span/size preset (e.g. "1", "2", "full") — not raw CSS. */
  columnPreset?: string;
  footerText?: string;
}

// ── Layout / grid settings ───────────────────────────────────────────────────
// Per-block layout controls for card grids, as requested: columns per
// breakpoint, gap, card size, alignment, container width, section padding.
export interface LayoutSettings {
  columnsDesktop?: 1 | 2 | 3 | 4;
  columnsTablet?: 1 | 2 | 3 | 4;
  columnsMobile?: 1 | 2;
  gap?: number;
  cardHeightPreset?: "auto" | "compact" | "tall";
  alignment?: "start" | "center" | "end";
  containerWidth?: "narrow" | "default" | "wide" | "full";
  paddingTop?: number;
  paddingBottom?: number;
  footerAreaEnabled?: boolean;
}

// ── Navigation settings ──────────────────────────────────────────────────────
// Extends the existing page_visibility concept (visible / nav_override_href /
// nav_override_label — see api/admin/page-visibility.php) with the additional
// fields the admin Pages overview will need. `navVisible`/`footerVisible` are
// display-only switches; they must never be treated as a substitute for
// `pages.status`, which stays the single source of truth for public
// reachability (see api/pages.php).
export interface NavSettings {
  navVisible: boolean;
  footerVisible: boolean;
  navLabel?: string;
  navOrder?: number;
  navOverridePath?: string;
  parentSlug?: string | null;
  isHomepage?: boolean;
}

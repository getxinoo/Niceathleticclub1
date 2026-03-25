/**
 * mock-db.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zentrale Mock-Datenbank fuer den Fallback-/Demo-Modus.
 * Wird von Admin-Seiten gelesen und beschrieben wenn das Backend nicht erreichbar ist.
 * Alle Aenderungen ueber das Admin-UI aktualisieren diese Daten im Speicher.
 */

import { TEAM_MEMBERS, TIMETABLE, type TeamMember, type TimetableEntry } from "./team";
import { MEMBERSHIP_PLANS, FITNESS_CLASSES, type MembershipPlan, type FitnessClass } from "./classes";
import {
  DEFAULT_BASE_PLANS,
  DEFAULT_ADDONS,
  DEFAULT_CONTRACT_NOTE,
  DEFAULT_BLAULICHT_NOTE,
  type BasePlan,
  type AddOn,
  type PricingData,
} from "./classes";
import { PRESS_ARTICLES, type PressArticle } from "./press";
import { MOCK_REVIEWS, MOCK_REVIEW_STATS, type GoogleReview, type ReviewStats } from "./reviews";
import type { PageOverride } from "../lib/pricing-types";
import { ALL_PAGE_SLUGS } from "../lib/pricing-types";

// ── Studio Info ───────────────────────────────────────────────────────────────
export interface StudioInfo {
  name: string;
  address: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  openingHours: { day: string; time: string; active: boolean }[];
}

// ── In-Memory Store ───────────────────────────────────────────────────────────
let _team: TeamMember[] = [...TEAM_MEMBERS];
let _timetable: TimetableEntry[] = [...TIMETABLE];
let _plans: MembershipPlan[] = [...MEMBERSHIP_PLANS];
let _classes: FitnessClass[] = [...FITNESS_CLASSES];
let _studioInfo: StudioInfo = {
  name: "Nice Athletic Club Goeppingen",
  address: "Robert-Bosch-Str. 5",
  zip: "73037",
  city: "Goeppingen",
  phone: "+49 (0) 7161 / 9163663",
  email: "info@nice-fitness.de",
  website: "https://www.nice-fitness.de",
  openingHours: [
    { day: "Mo – Fr",   time: "06:00 – 22:00", active: true  },
    { day: "Samstag",   time: "09:00 – 16:00", active: true  },
    { day: "Sonntag",   time: "09:00 – 14:00", active: true  },
    { day: "Feiertage", time: "09:00 – 14:00", active: false },
  ],
};

let _press: PressArticle[] = [...PRESS_ARTICLES];
let _reviews: GoogleReview[] = [...MOCK_REVIEWS];
let _reviewStats: ReviewStats = { ...MOCK_REVIEW_STATS };

// ── Pricing (modular system) ──────────────────────────────────────────────────
let _basePlans: BasePlan[] = [...DEFAULT_BASE_PLANS];
let _addOns: AddOn[] = [...DEFAULT_ADDONS];
let _contractNote: string = DEFAULT_CONTRACT_NOTE;
let _blaulichtNote: string = DEFAULT_BLAULICHT_NOTE;

// Page overrides storage: planSlug → PageOverride[]
// Initialize with sensible defaults so that every plan has overrides from the start.
// This avoids the legacy fallback path and ensures admin ↔ frontend consistency.
function buildDefaultPageOverrides(): Record<string, PageOverride[]> {
  const result: Record<string, PageOverride[]> = {};
  for (const plan of DEFAULT_BASE_PLANS) {
    result[plan.id] = ALL_PAGE_SLUGS.map((slug) => {
      // "Athletic + Unlimited" has no CTA on "preise" page (user-configured default)
      const hideCta = plan.id === "athletic-unlimited" && slug === "preise";

      return {
        page_slug: slug,
        is_visible: slug === "preise" || slug === "startseite",
        is_featured: plan.highlight && (slug === "preise" || slug === "startseite"),
        show_cta: !hideCta,
        badge_text: plan.highlight ? (plan.badge || "") : "",
        description_override: "",
        features_override: "",
        sort_order: plan.sortOrder,
      };
    });
  }
  return result;
}

let _pageOverrides: Record<string, PageOverride[]> = buildDefaultPageOverrides();

// ── Read operations ───────────────────────────────────────────────────────────
export const mockDb = {
  // Team
  getTeam: (): TeamMember[] => [..._team],
  getTeamMember: (id: string): TeamMember | undefined => _team.find((m) => m.id === id),
  getCoaches: (): TeamMember[] => _team.filter((m) => m.type === "coach"),
  getLeadership: (): TeamMember[] => _team.filter((m) => m.type === "leadership"),

  updateTeamMember: (id: string, data: Partial<TeamMember>): TeamMember | null => {
    const idx = _team.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    _team[idx] = { ..._team[idx], ...data };
    return _team[idx];
  },

  addTeamMember: (member: TeamMember): TeamMember => {
    _team.push(member);
    return member;
  },

  removeTeamMember: (id: string): boolean => {
    const len = _team.length;
    _team = _team.filter((m) => m.id !== id);
    return _team.length < len;
  },

  // Timetable / Courses
  getTimetable: (): TimetableEntry[] => [..._timetable],
  updateTimetableEntry: (id: string, data: Partial<TimetableEntry>): TimetableEntry | null => {
    const idx = _timetable.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    _timetable[idx] = { ..._timetable[idx], ...data };
    return _timetable[idx];
  },
  addTimetableEntry: (entry: TimetableEntry): TimetableEntry => {
    _timetable.push(entry);
    return entry;
  },
  removeTimetableEntry: (id: string): boolean => {
    const len = _timetable.length;
    _timetable = _timetable.filter((e) => e.id !== id);
    return _timetable.length < len;
  },

  // Membership Plans / Tarife
  getPlans: (): MembershipPlan[] => [..._plans],
  updatePlan: (id: string, data: Partial<MembershipPlan>): MembershipPlan | null => {
    const idx = _plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    _plans[idx] = { ..._plans[idx], ...data };
    return _plans[idx];
  },
  addPlan: (plan: MembershipPlan): MembershipPlan => {
    _plans.push(plan);
    return plan;
  },
  removePlan: (id: string): boolean => {
    const len = _plans.length;
    _plans = _plans.filter((p) => p.id !== id);
    return _plans.length < len;
  },

  // Fitness Classes (Programm-Typen)
  getClasses: (): FitnessClass[] => [..._classes],
  updateClass: (id: string, data: Partial<FitnessClass>): FitnessClass | null => {
    const idx = _classes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    _classes[idx] = { ..._classes[idx], ...data };
    return _classes[idx];
  },

  // Studio Info
  getStudioInfo: (): StudioInfo => ({ ..._studioInfo }),
  updateStudioInfo: (data: Partial<StudioInfo>): StudioInfo => {
    _studioInfo = { ..._studioInfo, ...data };
    return _studioInfo;
  },

  // Press / Medien
  getPress: (): PressArticle[] => [..._press].sort((a, b) => b.date.localeCompare(a.date)),
  getPressArticle: (id: string): PressArticle | undefined => _press.find((p) => p.id === id),
  addPressArticle: (article: PressArticle): PressArticle => {
    _press.push(article);
    return article;
  },
  updatePressArticle: (id: string, data: Partial<PressArticle>): PressArticle | null => {
    const idx = _press.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    _press[idx] = { ..._press[idx], ...data };
    return _press[idx];
  },
  removePressArticle: (id: string): boolean => {
    const len = _press.length;
    _press = _press.filter((p) => p.id !== id);
    return _press.length < len;
  },

  // ── Pricing (modular) ───────────────────────────────────────────────────────
  getPricingData: (): PricingData => ({
    basePlans: [..._basePlans].sort((a, b) => a.sortOrder - b.sortOrder),
    addOns: [..._addOns].sort((a, b) => a.sortOrder - b.sortOrder),
    contractNote: _contractNote,
    blaulichtNote: _blaulichtNote,
  }),

  // Base Plans
  getBasePlans: (): BasePlan[] => [..._basePlans].sort((a, b) => a.sortOrder - b.sortOrder),
  addBasePlan: (plan: BasePlan): BasePlan => { _basePlans.push(plan); return plan; },
  updateBasePlan: (id: string, data: Partial<BasePlan>): BasePlan | null => {
    const idx = _basePlans.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    _basePlans[idx] = { ..._basePlans[idx], ...data };
    return _basePlans[idx];
  },
  removeBasePlan: (id: string): boolean => {
    const len = _basePlans.length;
    _basePlans = _basePlans.filter((p) => p.id !== id);
    _pageOverrides = Object.fromEntries(Object.entries(_pageOverrides).filter(([k]) => k !== id));
    return _basePlans.length < len;
  },

  // Page Overrides per plan
  getPageOverrides: (planSlug: string): PageOverride[] | null => {
    return _pageOverrides[planSlug] ?? null;
  },
  setPageOverrides: (planSlug: string, overrides: PageOverride[]) => {
    _pageOverrides[planSlug] = overrides;
  },

  // Add-ons
  getAddOns: (): AddOn[] => [..._addOns].sort((a, b) => a.sortOrder - b.sortOrder),
  addAddOn: (addon: AddOn): AddOn => { _addOns.push(addon); return addon; },
  updateAddOn: (id: string, data: Partial<AddOn>): AddOn | null => {
    const idx = _addOns.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    _addOns[idx] = { ..._addOns[idx], ...data };
    return _addOns[idx];
  },
  removeAddOn: (id: string): boolean => {
    const len = _addOns.length;
    _addOns = _addOns.filter((a) => a.id !== id);
    return _addOns.length < len;
  },

  // Notes
  updatePricingNotes: (contractNote: string, blaulichtNote: string) => {
    _contractNote = contractNote;
    _blaulichtNote = blaulichtNote;
  },

  // ── Reviews ─────────────────────────────────────────────────────────────────
  getReviews: (): GoogleReview[] => [..._reviews].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  getVisibleReviews: (): GoogleReview[] => _reviews.filter((r) => r.visible).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  getReviewStats: (): ReviewStats => ({ ..._reviewStats }),
  toggleReviewVisibility: (id: string): GoogleReview | null => {
    const idx = _reviews.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    _reviews[idx] = { ..._reviews[idx], visible: !_reviews[idx].visible };
    return _reviews[idx];
  },
  removeReview: (id: string): boolean => {
    const len = _reviews.length;
    _reviews = _reviews.filter((r) => r.id !== id);
    return _reviews.length < len;
  },
  addReview: (review: GoogleReview): GoogleReview => {
    _reviews.push(review);
    return review;
  },
};
/**
 * use-pricing.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React Hook: Lädt seitenspezifische Pricing-Daten von der Public API.
 * Fallback auf lokale Mock-DB-Daten (Admin-editierbar) wenn die API nicht erreichbar ist.
 */

import { useState, useEffect } from "react";
import { BASE_URL } from "./api-service";
import type {
  PricingPageSlug,
  PublicPricingResponse,
  PublicPlan,
  PublicAddon,
  PublicNotice,
  ComparisonModule,
  ProsConsModule,
} from "./pricing-types";
import { mockDb } from "../data/mock-db";

// ── Fallback-Generator ───────────────────────────────────────────────────────
// Erzeugt Mock-Daten aus der Mock-DB (Admin-editierbar), passend zur page_slug.
// Berücksichtigt gespeicherte page_overrides für Sichtbarkeit, CTA, Badge etc.

function buildFallback(page: PricingPageSlug): PublicPricingResponse {
  const pricingData = mockDb.getPricingData();

  // Build plans with page-specific overrides
  const plans: PublicPlan[] = [];

  for (const basePlan of pricingData.basePlans) {
    const savedOverrides = mockDb.getPageOverrides(basePlan.id);

    // Use page overrides to determine visibility per page
    if (savedOverrides && savedOverrides.length > 0) {
      const pageOverride = savedOverrides.find((o) => o.page_slug === page);
      if (!pageOverride || !pageOverride.is_visible) continue;

      plans.push({
        id: parseInt(basePlan.id.replace(/\D/g, ""), 10) || Math.floor(Math.random() * 10000),
        slug: basePlan.id,
        name: basePlan.name,
        price: basePlan.price,
        period: basePlan.period,
        description: pageOverride.description_override || basePlan.description,
        features: pageOverride.features_override
          ? pageOverride.features_override.split("\n").map((f) => f.trim()).filter(Boolean)
          : basePlan.features,
        badge_text: pageOverride.is_featured ? (pageOverride.badge_text || null) : null,
        is_featured: pageOverride.is_featured,
        show_cta: pageOverride.show_cta,
        cta_text: basePlan.cta,
        cta_url: "/probetraining",
        restrictions: basePlan.restrictions ?? null,
        blaulicht_discount: basePlan.blaulichtDiscount ?? null,
        student_price: basePlan.studentPrice ?? null,
        sort_order: pageOverride.sort_order ?? basePlan.sortOrder,
      });
    }
    // No overrides at all → skip (every plan should have overrides via buildDefaultPageOverrides)
  }

  // Sort by sort_order
  plans.sort((a, b) => a.sort_order - b.sort_order);

  // Add-ons (only on "preise" page by default)
  const addons: PublicAddon[] =
    page === "preise"
      ? pricingData.addOns.map((a, i) => ({
          id: i + 1,
          slug: a.id,
          name: a.name,
          description: a.description ?? null,
          options: a.options,
          sort_order: a.sortOrder,
        }))
      : [];

  // Notices
  const notices: PublicNotice[] =
    page === "preise"
      ? [
          {
            id: 1,
            type: "contract",
            title: "Vertragsbedingungen",
            text: pricingData.contractNote,
            sort_order: 0,
          },
          {
            id: 2,
            type: "blaulicht",
            title: "Blaulicht-Rabatt",
            text: pricingData.blaulichtNote,
            sort_order: 1,
          },
        ]
      : [];

  // Comparison table
  const comparison: ComparisonModule | null =
    page === "preise" && plans.length > 0
      ? {
          enabled: true,
          columns: plans.map((p) => ({
            plan_slug: p.slug,
            plan_name: p.name,
            price: `${p.price} €`,
            is_featured: p.is_featured,
            badge_text: p.badge_text,
          })),
          rows: buildComparisonRows(plans),
        }
      : null;

  // Pros/Cons
  const pros_cons: ProsConsModule | null =
    page === "preise" && plans.length > 0
      ? {
          enabled: true,
          entries: plans.map((p) => ({
            plan_slug: p.slug,
            plan_name: p.name,
            price: `${p.price} €`,
            is_featured: p.is_featured,
            pros: prosConsData[p.slug]?.pros ?? [],
            cons: prosConsData[p.slug]?.cons ?? [],
          })),
        }
      : null;

  return { page, plans, addons, notices, comparison, pros_cons };
}

// ── Comparison Row Builder ───────────────────────────────────────────────────
function buildComparisonRows(plans: PublicPlan[]) {
  const slugs = plans.map((p) => p.slug);
  const allTrue = Object.fromEntries(slugs.map((s) => [s, true]));

  const rows = [
    {
      feature: "Monatspreis",
      values: Object.fromEntries(plans.map((p) => [p.slug, `${p.price} €`])),
    },
    {
      feature: "Trainingszeiten",
      values: Object.fromEntries(
        plans.map((p) => [
          p.slug,
          p.restrictions?.includes("Wochenende") || p.restrictions?.includes("Fr–So")
            ? "Fr–So"
            : "Täglich",
        ])
      ),
    },
    { feature: "Öffnungszeiten 5:00–00:00", values: allTrue },
    { feature: "Alle Geräte & Freiflächen", values: allTrue },
    { feature: "1.500+ qm Trainingsfläche", values: allTrue },
    { feature: "NAC App-Zugang", values: allTrue },
    {
      feature: "Training unter der Woche (Mo–Do)",
      values: Object.fromEntries(
        plans.map((p) => [
          p.slug,
          !(p.restrictions?.includes("Wochenende") || p.restrictions?.includes("Fr–So")),
        ])
      ),
    },
    {
      feature: "Schüler/Studenten-Rabatt",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, p.student_price ? `${p.student_price} €` : false])
      ),
    },
    {
      feature: "Nice Fitness & Spa Eislingen",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, p.slug === "nicest"])
      ),
    },
    {
      feature: "E-Gym Zugang",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, p.slug === "nicest"])
      ),
    },
    {
      feature: "Sauna & Solarium",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, p.slug === "nicest"])
      ),
    },
    {
      feature: "CrossFit Kurse (Unlimited)",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, p.slug === "athletic-unlimited"])
      ),
    },
    {
      feature: "HYROX Kurse (Unlimited)",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, p.slug === "athletic-unlimited"])
      ),
    },
    {
      feature: "Blaulicht-Rabatt (−10 €)",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, !!p.blaulicht_discount])
      ),
    },
    { feature: "Keine Mindestlaufzeit", values: allTrue },
    { feature: "Monatlich kündbar", values: allTrue },
  ];

  return rows;
}

// ── Pros/Cons Data ───────────────────────────────────────────────────────────
const prosConsData: Record<string, { pros: string[]; cons: string[] }> = {
  "athletic-weekend": {
    pros: ["Günstigster Einstieg", "Voller Zugang am Wochenende", "Gleiche Ausstattung wie Athletic"],
    cons: ["Kein Training Mo–Do", "Kein Schüler-Rabatt", "Keine Kurse inklusive"],
  },
  athletic: {
    pros: ["Bestes Preis-Leistungs-Verhältnis", "Tägliches Training", "Schüler-Rabatt verfügbar", "Blaulicht-Rabatt"],
    cons: ["Keine Kurse inklusive", "Kein Spa-Zugang"],
  },
  nicest: {
    pros: ["2 Standorte (Göppingen + Eislingen)", "Sauna, Solarium & Massageliege", "E-Gym & Kurse in Eislingen", "Blaulicht-Rabatt"],
    cons: ["Höherer Preis als Athletic", "CrossFit/HYROX nur als Add-on"],
  },
  "athletic-unlimited": {
    pros: ["Unbegrenzte CrossFit & HYROX Kurse", "Maximale Flexibilität", "All-in-one für Kurs-Enthusiasten"],
    cons: ["Höchster Preis", "Kein Spa-Zugang", "Kein Schüler-Rabatt"],
  },
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export interface UsePricingResult {
  data: PublicPricingResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePricingData(page: PricingPageSlug): UsePricingResult {
  const [data, setData] = useState<PublicPricingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/public/pricing.php?page=${page}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Validate minimal structure
      if (json && Array.isArray(json.plans)) {
        setData(json as PublicPricingResponse);
      } else {
        throw new Error("Invalid response shape");
      }
    } catch {
      // Fallback auf Mock-DB (enthält Admin-editierte Daten)
      setData(buildFallback(page));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  return { data, loading, error, refresh: load };
}
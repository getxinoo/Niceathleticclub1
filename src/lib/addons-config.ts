/**
 * addons-config.ts – CMS-Platzierung auf Domain-Add-ons anwenden
 * ─────────────────────────────────────────────────────────────────────────────
 * Ein pricing-addons-Block speichert nur LAYOUT-Daten (Reihenfolge, Slots,
 * Sichtbarkeit, Zeilen-Ausblendungen); die Karteninhalte selbst kommen aus
 * der Pricing-API (Tarifdaten). Dieser Merge wird von der öffentlichen
 * /preise-Seite UND der Admin-Vorschau identisch verwendet – eine Quelle,
 * kein Duplikat.
 */

import type { PublicAddon } from "./pricing-types";
import type { PricingAddonsBlockData } from "../data/blocks";

export function applyAddonsConfig(
  addons: PublicAddon[],
  data: Pick<PricingAddonsBlockData, "addonsConfig">
): PublicAddon[] {
  const cfgList = data.addonsConfig;
  if (!cfgList || cfgList.length === 0) return addons;

  return cfgList
    .filter((cfg) => !cfg.hidden)
    .map((cfg) => {
      const found = addons.find(
        (a) => a.slug === cfg.id || String(a.id) === cfg.id
      );
      if (!found) return null;
      const addon: PublicAddon = { ...found };

      const slot = Number(cfg.slot ?? 0);
      addon.slot = Number.isInteger(slot) && slot >= 1 && slot <= 6 ? slot : undefined;

      if (cfg.optionsConfig && cfg.optionsConfig.length > 0) {
        addon.options = cfg.optionsConfig
          .filter((optCfg) => !optCfg.hidden)
          .map((optCfg) =>
            addon.options?.find(
              (o) => (o.leftText ?? o.label) === optCfg.id || o.label === optCfg.id
            )
          )
          .filter(Boolean) as typeof addon.options;
      }
      return addon;
    })
    .filter(Boolean) as PublicAddon[];
}

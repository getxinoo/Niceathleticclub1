/**
 * public-blocks.ts – Lese-Pipeline für ÖFFENTLICHE CMS-Seiten
 * ─────────────────────────────────────────────────────────────────────────────
 * Verbindliche Priorität:
 *   1. Veröffentlichte Blöcke aus der Pages-API (autoritative Quelle)
 *   2. Seed-Daten NUR wenn die Seite serverseitig wirklich nicht existiert (404)
 *   3. NIEMALS localStorage – Browser-Entwürfe („Lokal zwischenspeichern“)
 *      sind Editor-intern und dürfen die öffentliche Seite nicht beeinflussen.
 *
 * API-Fehler (Netz/5xx) werden NICHT stillschweigend durch Seeds ersetzt:
 * sie werden als deutlicher console.error gemeldet; der Seed dient dann nur
 * als Notfall-Render, damit Besucher keine leere Seite sehen.
 */

import { BASE_URL } from "./api-service";
import type { PageBlock } from "../data/blocks";

export interface PublicBlocksResult {
  blocks: PageBlock[];
  /** "api" = veröffentlichte Server-Daten, "seed" = Fallback (404/Fehler) */
  source: "api" | "seed";
}

export async function fetchPublishedBlocks(
  slug: string,
  seed: PageBlock[]
): Promise<PublicBlocksResult> {
  try {
    const res = await fetch(`${BASE_URL}/pages.php?slug=${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
    });

    if (res.status === 404) {
      // Seite existiert (noch) nicht bzw. ist nicht veröffentlicht → Seed ist
      // hier die legitime Darstellung, kein verschluckter Fehler.
      return { blocks: seed, source: "seed" };
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    const payload = json?.data ?? json;
    if (Array.isArray(payload?.blocks)) {
      // Autoritative Antwort – auch ein leeres Array ist gültiger Inhalt.
      return { blocks: payload.blocks as PageBlock[], source: "api" };
    }
    throw new Error("Antwort ohne blocks-Array");
  } catch (err) {
    console.error(
      `[NAC public] Pages-API für "${slug}" nicht verfügbar – Seed als Notfall-Render. Ursache:`,
      err
    );
    return { blocks: seed, source: "seed" };
  }
}

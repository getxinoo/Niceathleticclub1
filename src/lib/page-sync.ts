/**
 * page-sync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Globale Einmal-Synchronisation: PAGE_INITIAL_BLOCKS → localStorage
 *
 * Strategie:
 *  • Beim ersten App-Start (oder bei Versions-Bump) werden ALLE Seiten aus
 *    PAGE_INITIAL_BLOCKS in die jeweiligen nac_blocks_{slug} Keys geschrieben.
 *  • Bei gleichbleibender Version bleibt localStorage unangetastet
 *    (Admin-Edits werden NICHT überschrieben).
 *  • Versions-Bump: PAGES_SYNC_VERSION hochzählen → kompletter Re-Seed aller Seiten.
 *
 * Nutzung:
 *  syncPageBlocksOnce() — einmalig im App-Bootstrap aufrufen (App.tsx).
 */

import { PAGE_INITIAL_BLOCKS } from "../data/blocks";

// ── Bump diese Version wenn PAGE_INITIAL_BLOCKS sich ändern ──────────────────
// Format: YYYY-MM-DD-vN
export const PAGES_SYNC_VERSION = "2026-03-27-v4";

const SYNC_VERSION_KEY = "nac_pages_sync_version";
const BLOCK_KEY_PREFIX = "nac_blocks_";

/**
 * Führt den initialen Page-Sync aus.
 * Wird von App.tsx synchron (vor dem Router-Load) aufgerufen.
 *
 * - Version stimmt  → nichts tun (Admin-Edits erhalten)
 * - Version veraltet → alle nac_blocks_* löschen + re-seeden + neue Version stempeln
 */
export function syncPageBlocksOnce(): void {
  try {
    const storedVersion = localStorage.getItem(SYNC_VERSION_KEY);

    if (storedVersion === PAGES_SYNC_VERSION) {
      // Alles aktuell – Admin-Edits bleiben erhalten
      return;
    }

    console.info(
      `%c[NAC PageSync] Version ${storedVersion ?? "none"} → ${PAGES_SYNC_VERSION} – Re-Seeding alle Seiten...`,
      "color:#CA0C85;font-weight:bold"
    );

    // 1. Alle bestehenden nac_blocks_* Keys entfernen
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BLOCK_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 2. Alle Seiten aus PAGE_INITIAL_BLOCKS neu seeden
    const slugs = Object.keys(PAGE_INITIAL_BLOCKS) as Array<keyof typeof PAGE_INITIAL_BLOCKS>;
    let seededCount = 0;

    for (const slug of slugs) {
      const blocks = PAGE_INITIAL_BLOCKS[slug];
      if (Array.isArray(blocks) && blocks.length > 0) {
        try {
          localStorage.setItem(`${BLOCK_KEY_PREFIX}${slug}`, JSON.stringify(blocks));
          seededCount++;
        } catch (e) {
          console.warn(`[NAC PageSync] Konnte ${slug} nicht in localStorage schreiben:`, e);
        }
      }
    }

    // 3. Neue Version stempeln
    localStorage.setItem(SYNC_VERSION_KEY, PAGES_SYNC_VERSION);

    console.info(
      `%c[NAC PageSync] ✓ ${seededCount} Seiten erfolgreich geseedet (Version: ${PAGES_SYNC_VERSION})`,
      "color:#22c55e;font-weight:bold"
    );
  } catch (e) {
    // localStorage nicht verfügbar (privates Browserfenster, etc.) → ignorieren
    console.warn("[NAC PageSync] localStorage nicht verfügbar:", e);
  }
}

/**
 * Manueller Re-Seed für eine einzelne Seite (z.B. nach Admin-Reset).
 * Überschreibt den localStorage-Eintrag mit dem Seed aus PAGE_INITIAL_BLOCKS.
 */
export function reseedPage(slug: string): boolean {
  try {
    const blocks = PAGE_INITIAL_BLOCKS[slug];
    if (!Array.isArray(blocks) || blocks.length === 0) return false;
    localStorage.setItem(`${BLOCK_KEY_PREFIX}${slug}`, JSON.stringify(blocks));
    window.dispatchEvent(new CustomEvent("nac-page-updated", { detail: { slug } }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Gibt alle geseedeten Slugs zurück (für Debug/Admin-Anzeige).
 */
export function getSeededSlugs(): string[] {
  const result: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BLOCK_KEY_PREFIX)) {
        result.push(key.replace(BLOCK_KEY_PREFIX, ""));
      }
    }
  } catch { /* ignore */ }
  return result;
}

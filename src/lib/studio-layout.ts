/**
 * studio-layout.ts – Slot-Logik für das Studio-Zonen-Mosaik
 * ─────────────────────────────────────────────────────────────────────────────
 * Verbindliche Layoutlogik: Nicht die Karte selbst ist dauerhaft „groß“ –
 * die POSITION innerhalb der sichtbaren Karten entscheidet über Größe und
 * Platzierung. Zwei Desktop-Varianten:
 *
 *   feature-left  → sichtbare Position 1 = großes Bild links,
 *                   Positionen 2+3 klein rechts gestapelt, 4–6 untere Reihe
 *   feature-right → sichtbare Positionen 1+2 klein links gestapelt,
 *                   Position 3 = großes Bild rechts, 4–6 untere Reihe
 *
 * Positionen ab 7 laufen in einem normalen Raster unter dem Mosaik weiter.
 * Mobile (Carousel) ist von der Variante unabhängig: gespeicherte Reihenfolge
 * 1 → 2 → 3 → …
 *
 * Dieses Modul ist bewusst zyklenfrei (keine React-/Seiten-Imports), damit es
 * sowohl von der Studio-Seite als auch von der Block-Registry (blocks.ts)
 * und dem Admin-Editor verwendet werden kann.
 */

export type StudioLayoutVariant = "feature-left" | "feature-right";

/** Gespeicherte/API-Daten können undefined oder Altwerte enthalten → sicherer Default. */
export function normalizeLayoutVariant(v: unknown): StudioLayoutVariant {
  return v === "feature-right" ? "feature-right" : "feature-left";
}

/** Index (0-basiert, innerhalb der SICHTBAREN Karten) des großen Feature-Slots. */
export function featureSlotIndex(variant: StudioLayoutVariant): number {
  return variant === "feature-right" ? 2 : 0;
}

/** True, wenn die sichtbare Position visibleIndex der große Feature-Slot ist. */
export function isFeatureSlot(variant: StudioLayoutVariant, visibleIndex: number): boolean {
  return visibleIndex === featureSlotIndex(variant);
}

const LABELS_LEFT = [
  "Groß links",
  "Klein rechts oben",
  "Klein rechts unten",
  "Klein unten links",
  "Klein unten Mitte",
  "Klein unten rechts",
];

const LABELS_RIGHT = [
  "Klein links oben",
  "Klein links unten",
  "Groß rechts",
  "Klein unten links",
  "Klein unten Mitte",
  "Klein unten rechts",
];

/**
 * Admin-Positionskennzeichnung, z. B. "Position 1 · Groß links".
 * visibleIndex ist 0-basiert innerhalb der sichtbaren Karten.
 */
export function slotPositionLabel(variant: StudioLayoutVariant, visibleIndex: number): string {
  const n = visibleIndex + 1;
  if (visibleIndex >= 6) return `Position ${n} · Zusatzraster`;
  const labels = variant === "feature-right" ? LABELS_RIGHT : LABELS_LEFT;
  return `Position ${n} · ${labels[visibleIndex]}`;
}

/**
 * BlockPreview – Admin-Preview-Wrapper für den PageEditor.
 *
 * Rendert jeden Block 1:1 identisch mit dem Live-Frontend, indem er die
 * zentrale BlockRenderer-Komponente verwendet.
 *
 * Für die Admin-Vorschau wird der Block in einem skalierten Container
 * angezeigt (Desktop: 1280px → skaliert auf Preview-Breite, Mobile: 390px).
 *
 * WICHTIG: Kein eigenes Rendering hier – alles geht durch BlockRenderer.tsx.
 */

import { BlockRenderer } from "../../components/blocks/BlockRenderer";
import type { PageBlock } from "../../../data/blocks";

interface BlockPreviewProps {
  block: PageBlock;
  previewMode: "desktop" | "mobile";
}

export function BlockPreview({ block }: BlockPreviewProps) {
  // BlockRenderer rendert full-size – die Skalierung erfolgt durch den
  // Scroll-Container im PageEditor (max-width: 1280px / 390px).
  // Wir geben den Block direkt weiter, kein Scaling-Wrapper nötig.
  return <BlockRenderer block={block} />;
}

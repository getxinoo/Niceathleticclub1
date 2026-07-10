/**
 * download-images.mjs — DISABLED / VALIDATION-ONLY (T2B asset-safety)
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ The original version of this script downloaded generic Unsplash STOCK
 * photos into public/images/. That is exactly the behavior that caused the
 * 2026-07-09 production image regression (real NAC logo/team/studio images were
 * replaced by stock imagery). It has been removed.
 *
 * This script no longer downloads anything. It ONLY validates that the real
 * canonical images already exist locally under public/images/, are non-empty,
 * are not HTML fallback files, and have valid image magic bytes. It never
 * fetches from Unsplash (or anywhere), never overwrites, never substitutes a
 * placeholder.
 *
 * Real assets are recovered from the live site / Figma Make export, committed
 * to public/images/, and mapped in vite.config.ts (FIGMA_ASSET_MAP). To add a
 * new image, put the real file in public/images/ and map its hash there.
 *
 * USAGE:
 *   node scripts/download-images.mjs   → validates local canonical assets
 *   npm run download-images            → same (kept for muscle-memory)
 */

import { readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');

// Canonical images that MUST exist locally (kept in sync with FIGMA_ASSET_MAP
// in vite.config.ts). Paths are relative to public/.
const REQUIRED = [
  'images/logo/nac-logo.png',
  'images/logo/nac-logo-admin.png',
  'images/team/dome.png',
  'images/team/mimi.png',
  'images/team/bella.png',
  'images/team/wilhelm.png',
  'images/team/lydi.png',
  'images/team/jana.png',
  'images/team/leo.png',
  'images/ueber-uns/mimi-action.png',
  'images/studio/entrance.png',
  'images/studio/crossfit-zone.png',
  'images/studio/athletic-zone.png',
  'images/studio/duschen.png',
  'images/studio/leg-day.png',
  'images/crossfit/pillar.png',
  'images/crossfit/hero.png',
  'images/crossfit/schedule.png',
  'images/crossfit/community.png',
  'images/hyrox/hyrox-zone.png',
  'images/hyrox/hero.png',
  'images/hyrox/community.png',
  'images/hyrox/gallery-1.png',
  'images/hyrox/gallery-3.png',
  'images/hyrox/gallery-5.png',
  'images/athletic/hero.png',
  'images/athletic/gallery-1.png',
  'images/athletic/gallery-2.png',
  'images/athletic/gallery-3.png',
  'images/athletic/gallery-4.png',
  'images/athletic/gallery-5.png',
  'images/theke/theke-area.png',
  'images/theke/espresso.png',
  'images/theke/lampe.png',
  'images/theke/wide.png',
];

/** Returns a short format label from magic bytes, or null if not a known image. */
function detectImage(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'PNG';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'JPEG';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'WEBP';
  if (buf.length >= 5 && buf.toString('ascii', 0, 5) === 'GIF87') return 'GIF';
  if (buf.length >= 6 && buf.toString('ascii', 0, 6) === 'GIF89a') return 'GIF';
  const head = buf.toString('utf8', 0, Math.min(buf.length, 400)).trim().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'SVG';
  return null;
}

/** True if the file looks like an HTML page (SPA-rewrite fallback), not an image. */
function looksLikeHtml(buf) {
  const head = buf.toString('utf8', 0, Math.min(buf.length, 400)).trim().toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

async function main() {
  console.log('\n🔒 NAC asset validator (no downloads — validation only)');
  console.log('══════════════════════════════════════════════');
  let ok = 0;
  const problems = [];

  for (const rel of REQUIRED) {
    const full = join(PUBLIC_DIR, rel);
    let size = 0;
    try {
      size = (await stat(full)).size;
    } catch {
      problems.push(`MISSING       ${rel}`);
      continue;
    }
    if (size === 0) { problems.push(`EMPTY (0 B)   ${rel}`); continue; }

    const buf = await readFile(full);
    if (looksLikeHtml(buf)) { problems.push(`HTML FALLBACK ${rel}`); continue; }
    const fmt = detectImage(buf);
    if (!fmt) { problems.push(`NOT AN IMAGE  ${rel}`); continue; }

    ok++;
  }

  console.log(`   Valid:   ${ok} / ${REQUIRED.length}`);
  if (problems.length) {
    console.log(`   Problems: ${problems.length}`);
    for (const p of problems) console.error(`     ✗ ${p}`);
    console.error('\n❌ Canonical assets incomplete/invalid. Restore the real files — ' +
      'do NOT download stock images. Build will fail on missing assets.\n');
    process.exit(1);
  }
  console.log('\n✅ All canonical assets present and valid. No downloads performed.\n');
}

main().catch((err) => {
  console.error('\n❌ Validator error:', err.message);
  process.exit(1);
});

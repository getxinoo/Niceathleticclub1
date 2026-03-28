/**
 * download-images.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Lädt alle Fitness-Bilder von Unsplash herunter und speichert sie unter
 * public/images/ in der korrekten Ordnerstruktur.
 *
 * Nach dem Download kann "npm run build" die Bilder als echte lokale
 * Dateien einbinden (Vite kopiert public/ automatisch nach dist/).
 *
 * USAGE:
 *   node scripts/download-images.mjs
 *   npm run download-images
 *
 * ANFORDERUNGEN:
 *   - Node.js 18+ (fetch ist nativ verfügbar)
 *   - Internetverbindung für den ersten Download
 *   - Nach dem Download: Bilder werden gecacht, kein erneuter Download nötig
 */

import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PUBLIC_IMAGES = join(PROJECT_ROOT, 'public', 'images');

// ── Bild-Downloads: Zielpfad → Unsplash-URL ──────────────────────────────────
const DOWNLOADS = [
  // ── Studio ─────────────────────────────────────────────────────────────────
  ['studio/entrance.png',       'https://images.unsplash.com/photo-1675312189035-8e7685cd620e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['studio/crossfit-zone.png',  'https://images.unsplash.com/photo-1706029831405-619b27e3260c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['studio/athletic-zone.png',  'https://images.unsplash.com/photo-1577992805669-c80be3285f36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['studio/duschen.png',        'https://images.unsplash.com/photo-1754390754632-ee84c133a3f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['studio/leg-day.png',        'https://images.unsplash.com/photo-1774279922117-4d68af51559e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],

  // ── CrossFit ───────────────────────────────────────────────────────────────
  ['crossfit/hero.png',         'https://images.unsplash.com/photo-1706029831405-619b27e3260c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['crossfit/pillar.png',       'https://images.unsplash.com/photo-1687803551107-b3ff415ef426?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['crossfit/schedule.png',     'https://images.unsplash.com/photo-1687803551107-b3ff415ef426?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['crossfit/community.png',    'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],

  // ── HYROX ──────────────────────────────────────────────────────────────────
  ['hyrox/hero.png',            'https://images.unsplash.com/photo-1757147517573-2521839225c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['hyrox/hyrox-zone.png',      'https://images.unsplash.com/photo-1674445304334-54e826ba8554?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['hyrox/community.png',       'https://images.unsplash.com/photo-1674445304334-54e826ba8554?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['hyrox/gallery-1.png',       'https://images.unsplash.com/photo-1710746904729-f3ad9f682bb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['hyrox/gallery-3.png',       'https://images.unsplash.com/photo-1577992805669-c80be3285f36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['hyrox/gallery-5.png',       'https://images.unsplash.com/photo-1687803551107-b3ff415ef426?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],

  // ── Athletic Area ──────────────────────────────────────────────────────────
  ['athletic/hero.png',         'https://images.unsplash.com/photo-1767552273968-da3464e2986c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['athletic/gallery-1.png',    'https://images.unsplash.com/photo-1577992805669-c80be3285f36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['athletic/gallery-2.png',    'https://images.unsplash.com/photo-1710746904729-f3ad9f682bb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['athletic/gallery-3.png',    'https://images.unsplash.com/photo-1767552273968-da3464e2986c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['athletic/gallery-4.png',    'https://images.unsplash.com/photo-1774279922117-4d68af51559e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['athletic/gallery-5.png',    'https://images.unsplash.com/photo-1706029831405-619b27e3260c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],

  // ── Theke / Café ───────────────────────────────────────────────────────────
  ['theke/theke-area.png',      'https://images.unsplash.com/photo-1693996045300-521e9d08cabc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],
  ['theke/espresso.png',        'https://images.unsplash.com/photo-1764361276489-79b17d9a8782?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85'],
  ['theke/lampe.png',           'https://images.unsplash.com/photo-1765980161462-e570da02217f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1000&q=85'],
  ['theke/wide.png',            'https://images.unsplash.com/photo-1693996045300-521e9d08cabc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85'],

  // ── Team ───────────────────────────────────────────────────────────────────
  ['team/dome.png',             'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1400&q=85'],
  ['team/mimi.png',             'https://images.unsplash.com/photo-1728854303060-e6b6fdf665cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85'],
  ['team/bella.png',            'https://images.unsplash.com/photo-1664673531303-c933ac4cee70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85'],
  ['team/wilhelm.png',          'https://images.unsplash.com/photo-1704223523232-526f6fab30a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85'],
  ['team/lydi.png',             'https://images.unsplash.com/photo-1642506539297-6021bf65badc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85'],
  ['team/jana.png',             'https://images.unsplash.com/photo-1728854303060-e6b6fdf665cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85'],
  ['team/leo.png',              'https://images.unsplash.com/flagged/photo-1597786776169-17549989c2bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85'],

  // ── Über Uns ───────────────────────────────────────────────────────────────
  ['ueber-uns/mimi-action.png', 'https://images.unsplash.com/photo-1642506539297-6021bf65badc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1400&q=85'],
];

// ── Download-Funktion ─────────────────────────────────────────────────────────
async function downloadImage(relativePath, url) {
  const fullPath = join(PUBLIC_IMAGES, relativePath);
  const dir = dirname(fullPath);

  // Bereits vorhanden? → überspringen
  try {
    await access(fullPath);
    console.log(`  ✓ (bereits vorhanden) ${relativePath}`);
    return;
  } catch {
    // Datei existiert nicht → herunterladen
  }

  // Ordner erstellen falls nicht vorhanden
  await mkdir(dir, { recursive: true });

  // Bild herunterladen
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NAC-Image-Downloader/1.0',
      'Accept': 'image/jpeg,image/png,image/*',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} für ${url}`);
  }

  const buffer = await response.arrayBuffer();
  await writeFile(fullPath, Buffer.from(buffer));
  const kb = Math.round(buffer.byteLength / 1024);
  console.log(`  ↓ ${relativePath} (${kb} KB)`);
}

// ── Hauptprogramm ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🏋️  NAC Image Downloader');
  console.log('══════════════════════════════════════════════');
  console.log(`📁 Zielordner: public/images/`);
  console.log(`📦 ${DOWNLOADS.length} Bilder zu prüfen\n`);

  // Hauptordner erstellen
  await mkdir(PUBLIC_IMAGES, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const [relativePath, url] of DOWNLOADS) {
    try {
      const fullPath = join(PUBLIC_IMAGES, relativePath);
      let exists = false;
      try { await access(fullPath); exists = true; } catch {}

      await downloadImage(relativePath, url);
      if (exists) skipped++; else downloaded++;
    } catch (err) {
      console.error(`  ✗ FEHLER ${relativePath}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(`✅ Fertig!`);
  console.log(`   Neu heruntergeladen:  ${downloaded}`);
  console.log(`   Bereits vorhanden:    ${skipped}`);
  if (errors > 0) console.log(`   Fehler:               ${errors}`);
  console.log('\n💡 Jetzt "npm run build" ausführen');
  console.log('   Die Bilder werden automatisch nach dist/images/ kopiert.\n');
}

main().catch((err) => {
  console.error('\n❌ Kritischer Fehler:', err.message);
  process.exit(1);
});

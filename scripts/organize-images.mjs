/**
 * organize-images.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Backup-Script für den Fall, dass Figma Make den Build ohne assetFileNames-
 * Funktion verarbeitet und Bilder in dist/assets/ mit Hash-Namen ablegt.
 *
 * Führe dieses Script einmalig nach dem Build aus:
 *   node scripts/organize-images.mjs
 *
 * Was es tut:
 *  1. Liest dist/assets/ nach PNG/JPG-Dateien
 *  2. Erkennt Figma-Hashes im Dateinamen (z.B. "25416d75...f56-abc.png")
 *  3. Kopiert Dateien nach dist/images/kategorie/name.png
 *  4. Gibt eine Zusammenfassung aus
 *
 * Nach dem Hochladen auf nicefitness.de: einmal erledigt, nie wieder nötig
 * (solange sich die Bilder in Figma nicht ändern).
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DIST_DIR  = join(ROOT, 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');

// ── Hash → Ziel-Pfad (ohne führenden Slash) ──────────────────────────────────
const HASH_TO_PATH = {
  '25416d75fab01c06b3ba37880c92088e26112f56': 'images/logo/nac-logo.png',
  'c836b0dc1e8ed6dd71de1118b818ee7b961a2cf5': 'images/logo/nac-logo-admin.png',

  '284e5d8ca0e490b15fa5e6c243baade9f2c5e58b': 'images/team/dome.png',
  '01e56d888ada221139d4cd3ceecf9e84c5b1b489': 'images/team/mimi.png',
  '186758abe630a88bee123d9214674c4db4c0e1a3': 'images/team/bella.png',
  '09670aeabc97c82b7de10ec256887020863e72bf': 'images/team/wilhelm.png',
  '967204562f3f0d41ab9c97feb6a34996ff6af024': 'images/team/lydi.png',
  '99cbcf366cae64b5d24c337635adb1f9e3434879': 'images/team/jana.png',
  '40c3992dc8c9be1044ab34af0be6248aaf203465': 'images/team/leo.png',

  '24554336b9b4f6e13f6ef2a7f200d6914a979118': 'images/ueber-uns/mimi-action.png',

  '4d0137fe5cbc4aed779b344b68c6ae4a170d2668': 'images/studio/entrance.png',
  '074311f22e30fb140e6274c625d4f86c2eb55278': 'images/studio/crossfit-zone.png',
  '12f0eb425f227fc6169c67d1390da3067ec74f70': 'images/studio/athletic-zone.png',
  'f06118a1042cae64d2462baf0c816cd2aa82d64a': 'images/studio/duschen.png',
  'a75ed35fb9db584ac8784f61a27d15e2e55f72e9': 'images/studio/leg-day.png',

  '0056420c6523fcaf0bc63febb2b162354bc9a245': 'images/crossfit/pillar.png',
  '18f8b000a6830c4e5c290c3ac9791507dff42cb0': 'images/crossfit/hero.png',
  'c2ea08b1dc715a3a10fd1069824bb9159588c6a1': 'images/crossfit/schedule.png',
  '35e76d1d2d057faed6dca6fc46b6517adbac4d35': 'images/crossfit/community.png',

  '4365f816dcc86a67f27557eee60c8f4cf8a11b3d': 'images/hyrox/hyrox-zone.png',
  '25ab7f957d222d82bbcb0d0ac4adb54ff41d956e': 'images/hyrox/hero.png',
  '2fd168ab3eb07b953e192fa2b4e06a5d2814827a': 'images/hyrox/community.png',
  'dddead2f8bc505281b896a452156390eec3ca473': 'images/hyrox/gallery-1.png',
  'c8de12aed1af3f1dbef20c85f8eedfdef99cb5b6': 'images/hyrox/gallery-3.png',
  '8349c307f48e63096bf0253e1f8dee688878d96e': 'images/hyrox/gallery-5.png',

  'a3ce98c339ff8c2006773759eeb77a3c43abf78a': 'images/athletic/hero.png',
  '8a0625f157027f7d78a77b8a5fbf3b4b93777f97': 'images/athletic/gallery-1.png',
  'e704c2ac0998162964d3a3daf9a29da8f72c02fb': 'images/athletic/gallery-2.png',
  '7b24826278b15fbc7dc3655d444a32e8e77c4363': 'images/athletic/gallery-3.png',
  '5de102692d016d2b111df6d8ffedcaac846d6cb2': 'images/athletic/gallery-4.png',
  '374ce31108a424a9844144e6efd71e4f725a4976': 'images/athletic/gallery-5.png',

  '340d3320565627752ba7f105637cdbc8dc4d4584': 'images/theke/theke-area.png',
  '9167c06f34c94e5af2c687066a3c86bb94bbfb63': 'images/theke/espresso.png',
  'bfa8de2895c6f75fb2e41c582089ee11ce2fb86f': 'images/theke/lampe.png',
  '419ac9b5ae50c324b84c8f6b2472a7c7d6346a8e': 'images/theke/wide.png',
};

// ── Hilfsfunktion: Datei finden die den Hash im Namen enthält ─────────────────
function findFileByHash(dir, hash) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir);
  for (const file of files) {
    // Dateiname enthält den Hash (ggf. mit Rollup-Hash danach: HASH-ROLLUP.ext)
    if (file.startsWith(hash) || file.includes(hash)) {
      const fullPath = join(dir, file);
      if (statSync(fullPath).isFile()) return fullPath;
    }
  }
  return null;
}

// ── Haupt-Script ──────────────────────────────────────────────────────────────
console.log('\n🗂️  Nice Athletic Club – Image Organizer\n');
console.log(`📁 Suche Bilder in: ${ASSETS_DIR}\n`);

if (!existsSync(ASSETS_DIR)) {
  console.error('❌ dist/assets/ nicht gefunden! Zuerst "npm run build" ausführen.\n');
  process.exit(1);
}

let copied = 0;
let missing = 0;

for (const [hash, targetRelPath] of Object.entries(HASH_TO_PATH)) {
  const sourcePath = findFileByHash(ASSETS_DIR, hash);
  const targetPath = join(DIST_DIR, targetRelPath);

  if (!sourcePath) {
    console.log(`⚠️  Nicht gefunden: ${hash.slice(0, 16)}... → ${targetRelPath}`);
    missing++;
    continue;
  }

  // Ziel-Ordner erstellen
  mkdirSync(dirname(targetPath), { recursive: true });

  // Kopieren
  copyFileSync(sourcePath, targetPath);
  console.log(`✅ ${targetRelPath}`);
  copied++;
}

console.log(`\n────────────────────────────────────`);
console.log(`✅ Kopiert:       ${copied} Bilder`);
if (missing > 0) {
  console.log(`⚠️  Nicht gefunden: ${missing} Bilder (noch nicht in Figma hochgeladen?)`);
}
console.log(`\n📦 Fertig! Lade jetzt den Inhalt von dist/ auf nicefitness.de hoch.\n`);
console.log(`   Ordnerstruktur auf dem Server:`);
console.log(`   nicefitness.de/`);
console.log(`   ├── images/`);
console.log(`   │   ├── logo/       (nac-logo.png, nac-logo-admin.png)`);
console.log(`   │   ├── team/       (dome.png, mimi.png, bella.png, …)`);
console.log(`   │   ├── studio/     (entrance.png, crossfit-zone.png, …)`);
console.log(`   │   ├── crossfit/   (hero.png, pillar.png, schedule.png, …)`);
console.log(`   │   ├── hyrox/      (hero.png, community.png, gallery-*.png)`);
console.log(`   │   ├── athletic/   (hero.png, gallery-1..5.png)`);
console.log(`   │   ├── theke/      (espresso.png, lampe.png, wide.png)`);
console.log(`   │   └── ueber-uns/  (mimi-action.png)`);
console.log(`   └── … (index.html, assets/, etc.)\n`);

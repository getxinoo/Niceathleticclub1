import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * ── FIGMA ASSET SYSTEM ───────────────────────────────────────────────────────
 *
 * figma:asset/HASH.png ist ein virtuelles Modul-Schema das von Figma Make
 * intern aufgelöst wird (enforce: 'pre').
 *
 * UMGEBUNGEN:
 *  A) Figma Make Preview/Export
 *     → Figma's Plugin greift zuerst (enforce:'pre') → unseres nie aufgerufen.
 *     → assetFileNames benennt emittierte Assets in stabile dist/images/-Pfade.
 *
 *  B) Lokaler "npm run build" / "npm run dev" (ohne Figma Make)
 *     → Figma's System existiert nicht.
 *     → Unser Plugin (enforce:'post') greift ein und gibt die zugeordnete
 *       Bild-URL zurück → Build läuft durch, echte Bilder werden angezeigt.
 *
 * ── BILD-STRATEGIE FÜR LOKALEN BUILD ────────────────────────────────────────
 *  Jeder Figma-Hash ist auf eine inhaltlich passende Bild-URL gemappt.
 *  → keine Platzhalter, echte Fitness-Fotos in allen Kategorien
 *
 *  Für die finale Produktion (Checkdomain-Hosting):
 *   1. Figma Make Export starten → Figma liefert die echten NAC-Fotos
 *   2. ODER: npm run download-images → lädt Bilder nach public/images/
 *      und ersetzt die URLs mit lokalen Pfaden im Build
 */

// ── Unsplash Bild-URLs nach Kategorie ────────────────────────────────────────
const IMG = {
  // Studio / Eingang
  GYM_ENTRANCE:   'https://images.unsplash.com/photo-1675312189035-8e7685cd620e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  // CrossFit Box
  CROSSFIT_BOX:   'https://images.unsplash.com/photo-1706029831405-619b27e3260c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  CROSSFIT_IND:   'https://images.unsplash.com/photo-1687803551107-b3ff415ef426?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  // HYROX
  HYROX_WALL:     'https://images.unsplash.com/photo-1757147517573-2521839225c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  HYROX_ROWING:   'https://images.unsplash.com/photo-1674445304334-54e826ba8554?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  // Athletic / Kraft
  BARBELL:        'https://images.unsplash.com/photo-1767552273968-da3464e2986c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  POWER_RACK:     'https://images.unsplash.com/photo-1577992805669-c80be3285f36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  DUMBBELLS:      'https://images.unsplash.com/photo-1710746904729-f3ad9f682bb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  LEG_PRESS:      'https://images.unsplash.com/photo-1774279922117-4d68af51559e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  // Team / Personen
  TEAM_GROUP:     'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85',
  TRAINER_MALE_1: 'https://images.unsplash.com/photo-1704223523232-526f6fab30a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85',
  TRAINER_MALE_2: 'https://images.unsplash.com/flagged/photo-1597786776169-17549989c2bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85',
  TRAINER_FEM_1:  'https://images.unsplash.com/photo-1728854303060-e6b6fdf665cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85',
  TRAINER_FEM_2:  'https://images.unsplash.com/photo-1664673531303-c933ac4cee70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85',
  TRAINER_FEM_3:  'https://images.unsplash.com/photo-1642506539297-6021bf65badc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=85',
  // Theke / Café
  ESPRESSO:       'https://images.unsplash.com/photo-1764361276489-79b17d9a8782?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85',
  SHAKE_BAR:      'https://images.unsplash.com/photo-1693996045300-521e9d08cabc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600&q=85',
  LAMP:           'https://images.unsplash.com/photo-1765980161462-e570da02217f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85',
  // Studio Bereiche
  SHOWER:         'https://images.unsplash.com/photo-1754390754632-ee84c133a3f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85',
  PREMIUM_BRAND:  'https://images.unsplash.com/photo-1760037028636-6f42428aeeee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=85',
} as const;

// ── Hash → Bild-URL Mapping ───────────────────────────────────────────────────
// Jeder Figma-Asset-Hash zeigt auf ein inhaltlich passendes echtes Bild.
// Beim Figma-Make-Export werden diese durch die echten NAC-Fotos ersetzt.
const FIGMA_ASSET_URLS: Record<string, string> = {
  // ── Logos ─────────────────────────────────────────────────────────────────
  // Logos sind spezifische SVG/PNG-Dateien → für lokalen Build Premium-Bild
  '25416d75fab01c06b3ba37880c92088e26112f56.png': IMG.PREMIUM_BRAND,
  'c836b0dc1e8ed6dd71de1118b818ee7b961a2cf5.png': IMG.PREMIUM_BRAND,

  // ── Team Fotos ────────────────────────────────────────────────────────────
  '284e5d8ca0e490b15fa5e6c243baade9f2c5e58b.png': IMG.TEAM_GROUP,    // dome (Gruppenshot)
  '01e56d888ada221139d4cd3ceecf9e84c5b1b489.png': IMG.TRAINER_FEM_1, // mimi
  '186758abe630a88bee123d9214674c4db4c0e1a3.png': IMG.TRAINER_FEM_2, // bella
  '09670aeabc97c82b7de10ec256887020863e72bf.png': IMG.TRAINER_MALE_1, // wilhelm
  '967204562f3f0d41ab9c97feb6a34996ff6af024.png': IMG.TRAINER_FEM_3, // lydi
  '99cbcf366cae64b5d24c337635adb1f9e3434879.png': IMG.TRAINER_FEM_1, // jana
  '40c3992dc8c9be1044ab34af0be6248aaf203465.png': IMG.TRAINER_MALE_2, // leo

  // ── Über Uns ──────────────────────────────────────────────────────────────
  '24554336b9b4f6e13f6ef2a7f200d6914a979118.png': IMG.TRAINER_FEM_3, // mimi-action

  // ── Studio / Shared ───────────────────────────────────────────────────────
  '4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png': IMG.GYM_ENTRANCE,  // entrance
  '074311f22e30fb140e6274c625d4f86c2eb55278.png': IMG.CROSSFIT_BOX,  // crossfit-zone
  '12f0eb425f227fc6169c67d1390da3067ec74f70.png': IMG.POWER_RACK,    // athletic-zone
  'f06118a1042cae64d2462baf0c816cd2aa82d64a.png': IMG.SHOWER,        // duschen
  'a75ed35fb9db584ac8784f61a27d15e2e55f72e9.png': IMG.LEG_PRESS,     // leg-day

  // ── CrossFit ──────────────────────────────────────────────────────────────
  '0056420c6523fcaf0bc63febb2b162354bc9a245.png': IMG.CROSSFIT_IND,  // pillar
  '18f8b000a6830c4e5c290c3ac9791507dff42cb0.png': IMG.CROSSFIT_BOX,  // hero
  'c2ea08b1dc715a3a10fd1069824bb9159588c6a1.png': IMG.CROSSFIT_IND,  // schedule
  '35e76d1d2d057faed6dca6fc46b6517adbac4d35.png': IMG.TEAM_GROUP,    // community

  // ── Hyrox ─────────────────────────────────────────────────────────────────
  '4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png': IMG.HYROX_ROWING,  // hyrox-zone
  '25ab7f957d222d82bbcb0d0ac4adb54ff41d956e.png': IMG.HYROX_WALL,    // hero
  '2fd168ab3eb07b953e192fa2b4e06a5d2814827a.png': IMG.HYROX_ROWING,  // community
  'dddead2f8bc505281b896a452156390eec3ca473.png': IMG.DUMBBELLS,      // gallery-1
  'c8de12aed1af3f1dbef20c85f8eedfdef99cb5b6.png': IMG.POWER_RACK,    // gallery-3
  '8349c307f48e63096bf0253e1f8dee688878d96e.png': IMG.CROSSFIT_IND,  // gallery-5

  // ── Athletic Area ─────────────────────────────────────────────────────────
  'a3ce98c339ff8c2006773759eeb77a3c43abf78a.png': IMG.BARBELL,       // hero
  '8a0625f157027f7d78a77b8a5fbf3b4b93777f97.png': IMG.POWER_RACK,    // gallery-1
  'e704c2ac0998162964d3a3daf9a29da8f72c02fb.png': IMG.DUMBBELLS,     // gallery-2
  '7b24826278b15fbc7dc3655d444a32e8e77c4363.png': IMG.BARBELL,       // gallery-3
  '5de102692d016d2b111df6d8ffedcaac846d6cb2.png': IMG.LEG_PRESS,     // gallery-4
  '374ce31108a424a9844144e6efd71e4f725a4976.png': IMG.CROSSFIT_BOX,  // gallery-5

  // ── Theke ─────────────────────────────────────────────────────────────────
  '340d3320565627752ba7f105637cdbc8dc4d4584.png': IMG.SHAKE_BAR,     // theke-area
  '9167c06f34c94e5af2c687066a3c86bb94bbfb63.png': IMG.ESPRESSO,      // espresso
  'bfa8de2895c6f75fb2e41c582089ee11ce2fb86f.png': IMG.LAMP,          // lampe
  '419ac9b5ae50c324b84c8f6b2472a7c7d6346a8e.png': IMG.SHAKE_BAR,    // wide
};

// ── Hash → stabiler dist/-Pfad (für Figma Make assetFileNames) ───────────────
// Wenn Figma Make die echten Bilder emittiert, landen sie in dist/images/...
const FIGMA_ASSET_MAP: Record<string, string> = {
  '25416d75fab01c06b3ba37880c92088e26112f56.png': 'images/logo/nac-logo.png',
  'c836b0dc1e8ed6dd71de1118b818ee7b961a2cf5.png': 'images/logo/nac-logo-admin.png',
  '284e5d8ca0e490b15fa5e6c243baade9f2c5e58b.png': 'images/team/dome.png',
  '01e56d888ada221139d4cd3ceecf9e84c5b1b489.png': 'images/team/mimi.png',
  '186758abe630a88bee123d9214674c4db4c0e1a3.png': 'images/team/bella.png',
  '09670aeabc97c82b7de10ec256887020863e72bf.png': 'images/team/wilhelm.png',
  '967204562f3f0d41ab9c97feb6a34996ff6af024.png': 'images/team/lydi.png',
  '99cbcf366cae64b5d24c337635adb1f9e3434879.png': 'images/team/jana.png',
  '40c3992dc8c9be1044ab34af0be6248aaf203465.png': 'images/team/leo.png',
  '24554336b9b4f6e13f6ef2a7f200d6914a979118.png': 'images/ueber-uns/mimi-action.png',
  '4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png': 'images/studio/entrance.png',
  '074311f22e30fb140e6274c625d4f86c2eb55278.png': 'images/studio/crossfit-zone.png',
  '12f0eb425f227fc6169c67d1390da3067ec74f70.png': 'images/studio/athletic-zone.png',
  'f06118a1042cae64d2462baf0c816cd2aa82d64a.png': 'images/studio/duschen.png',
  'a75ed35fb9db584ac8784f61a27d15e2e55f72e9.png': 'images/studio/leg-day.png',
  '0056420c6523fcaf0bc63febb2b162354bc9a245.png': 'images/crossfit/pillar.png',
  '18f8b000a6830c4e5c290c3ac9791507dff42cb0.png': 'images/crossfit/hero.png',
  'c2ea08b1dc715a3a10fd1069824bb9159588c6a1.png': 'images/crossfit/schedule.png',
  '35e76d1d2d057faed6dca6fc46b6517adbac4d35.png': 'images/crossfit/community.png',
  '4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png': 'images/hyrox/hyrox-zone.png',
  '25ab7f957d222d82bbcb0d0ac4adb54ff41d956e.png': 'images/hyrox/hero.png',
  '2fd168ab3eb07b953e192fa2b4e06a5d2814827a.png': 'images/hyrox/community.png',
  'dddead2f8bc505281b896a452156390eec3ca473.png': 'images/hyrox/gallery-1.png',
  'c8de12aed1af3f1dbef20c85f8eedfdef99cb5b6.png': 'images/hyrox/gallery-3.png',
  '8349c307f48e63096bf0253e1f8dee688878d96e.png': 'images/hyrox/gallery-5.png',
  'a3ce98c339ff8c2006773759eeb77a3c43abf78a.png': 'images/athletic/hero.png',
  '8a0625f157027f7d78a77b8a5fbf3b4b93777f97.png': 'images/athletic/gallery-1.png',
  'e704c2ac0998162964d3a3daf9a29da8f72c02fb.png': 'images/athletic/gallery-2.png',
  '7b24826278b15fbc7dc3655d444a32e8e77c4363.png': 'images/athletic/gallery-3.png',
  '5de102692d016d2b111df6d8ffedcaac846d6cb2.png': 'images/athletic/gallery-4.png',
  '374ce31108a424a9844144e6efd71e4f725a4976.png': 'images/athletic/gallery-5.png',
  '340d3320565627752ba7f105637cdbc8dc4d4584.png': 'images/theke/theke-area.png',
  '9167c06f34c94e5af2c687066a3c86bb94bbfb63.png': 'images/theke/espresso.png',
  'bfa8de2895c6f75fb2e41c582089ee11ce2fb86f.png': 'images/theke/lampe.png',
  '419ac9b5ae50c324b84c8f6b2472a7c7d6346a8e.png': 'images/theke/wide.png',
};

/**
 * figmaAssetFallbackPlugin
 * ─────────────────────────────────────────────────────────────────────────────
 * enforce: 'post' → läuft NACH Figma Make's eigenem Plugin (enforce:'pre').
 *
 * In Figma Make's Umgebung: resolveId() wird nie aufgerufen
 * (Figma's Plugin hat den Import schon aufgelöst).
 *
 * Beim lokalen npm run build / npm run dev:
 * → Jeder figma:asset/HASH wird auf die zugeordnete URL gemappt
 * → Echte Fitness-Fotos, keine Platzhalter
 */
function figmaAssetFallbackPlugin(): Plugin {
  const VIRTUAL_PREFIX = '\0figma:asset/';

  return {
    name: 'figma-asset-local-fallback',
    enforce: 'post',

    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const hash = id.slice('figma:asset/'.length);
        return VIRTUAL_PREFIX + hash;
      }
    },

    load(id: string) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const hash = id.slice(VIRTUAL_PREFIX.length); // "HASH.png"
        // Gib die direkte Bild-URL zurück – kein Placeholder!
        const url = FIGMA_ASSET_URLS[hash] ?? IMG.GYM_ENTRANCE;
        return `export default ${JSON.stringify(url)};`;
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    figmaAssetFallbackPlugin(), // enforce:'post' → läuft zuletzt
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    rollupOptions: {
      output: {
        /**
         * Im Figma Make Export: Bilder werden mit ihrem HASH-Namen emittiert.
         * Wir mappen jeden Hash auf den semantischen Zielpfad.
         * → dist/images/team/mimi.png statt dist/assets/abc123.png
         */
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          if (FIGMA_ASSET_MAP[name]) {
            return FIGMA_ASSET_MAP[name];
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
})

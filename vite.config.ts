import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * ── FIGMA ASSET SYSTEM (STRICT, ASSET-SAFE) ──────────────────────────────────
 *
 * `figma:asset/HASH.png` is a virtual import scheme used by the Figma Make
 * export environment. In our local `npm run build` / `npm run dev` (no Figma
 * Make), those virtual imports are resolved by `figmaAssetLocalResolverPlugin`
 * below.
 *
 * SAFETY MODEL (T2B — replaces the old Unsplash-fallback behavior that caused
 * the 2026-07-09 production image incident):
 *   • Every known hash resolves ONLY to a local canonical file under
 *     `public/images/...` (see FIGMA_ASSET_MAP). At runtime the app loads it
 *     as an absolute `/images/...` URL — identical to the live production site.
 *   • An UNKNOWN hash → the build FAILS (no silent fallback).
 *   • A mapped hash whose local file is MISSING → the build FAILS.
 *   • No hash may ever resolve to images.unsplash.com or any external stock
 *     image. There is intentionally no remote fallback anymore.
 *
 * To add a new image: add the real file to public/images/<path> AND add its
 * hash → path entry to FIGMA_ASSET_MAP. Anything less fails the build loudly.
 */

// ── Hash → canonical local path under public/ (single source of truth) ───────
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
 * figmaAssetLocalResolverPlugin
 * ─────────────────────────────────────────────────────────────────────────────
 * enforce: 'post' → runs AFTER Figma Make's own plugin (enforce:'pre'), so in
 * the Figma Make export environment this is never invoked. In local builds it
 * resolves every `figma:asset/HASH` to its canonical local `/images/...` path,
 * and FAILS THE BUILD on any unknown hash or missing local file.
 */
function figmaAssetLocalResolverPlugin(): Plugin {
  const VIRTUAL_PREFIX = '\0figma:asset/';
  const publicDir = path.resolve(__dirname, 'public');

  return {
    name: 'figma-asset-local-resolver',
    enforce: 'post',

    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        return VIRTUAL_PREFIX + id.slice('figma:asset/'.length);
      }
    },

    load(id: string) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return;
      const hash = id.slice(VIRTUAL_PREFIX.length); // "HASH.png"

      const rel = FIGMA_ASSET_MAP[hash];
      if (!rel) {
        this.error(
          `[figma-asset] Unknown asset hash "${hash}". No canonical mapping in ` +
          `FIGMA_ASSET_MAP (vite.config.ts). Add the real image to ` +
          `public/images/... and map the hash there. Build aborted — no stock/` +
          `Unsplash fallback is permitted.`
        );
      }

      const abs = path.join(publicDir, rel);
      if (!fs.existsSync(abs)) {
        this.error(
          `[figma-asset] Mapped file missing on disk: public/${rel} ` +
          `(hash ${hash}). Restore the real asset before building. ` +
          `Build aborted — no stock/Unsplash fallback is permitted.`
        );
      }

      // Absolute web path — matches production; the file is served from public/.
      return `export default ${JSON.stringify('/' + rel)};`;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    figmaAssetLocalResolverPlugin(), // enforce:'post' → runs last
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
         * In the Figma Make export, images are emitted with their HASH name;
         * we map each hash to its semantic dist/images/... target path.
         * (In local builds the resolver above returns public/ paths instead,
         * so this only applies to the Figma Make emit path.)
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

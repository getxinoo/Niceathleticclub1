/**
 * images.ts – Zentrale Bild-Registry für den Nice Athletic Club
 * ─────────────────────────────────────────────────────────────────────────────
 * Importiert alle Bilder via figma:asset, die vom vite.config.ts Plugin
 * auf stabile /images/KATEGORIE/NAME.png Pfade aufgelöst werden.
 *
 * ── Wie funktioniert das? ─────────────────────────────────────────────────────
 *  1. figma:asset/HASH.png → vite.config.ts Plugin → "/images/kategorie/name.png"
 *  2. Build-Output: dist/images/kategorie/name.png (stabile Dateinamen!)
 *  3. Einmal auf nicefitness.de/images/ hochladen → nie wieder neu hochladen
 *
 * ── Server-Ordnerstruktur ─────────────────────────────────────────────────────
 *  nicefitness.de/images/
 *  ├── logo/
 *  │   ├── nac-logo.png          (Navbar + Footer)
 *  │   └── nac-logo-admin.png    (Admin-Bereich)
 *  ├── team/
 *  │   ├── dome.png
 *  │   ├── mimi.png
 *  │   ├── bella.png
 *  │   ├── wilhelm.png
 *  │   ├── lydi.png
 *  │   ├── jana.png
 *  │   └── leo.png
 *  ├── studio/
 *  │   ├── entrance.png          (Eingang / Athletic Pillar)
 *  │   ├── crossfit-zone.png
 *  │   ├── athletic-zone.png
 *  │   ├── duschen.png
 *  │   └── leg-day.png
 *  ├── crossfit/
 *  │   ├── pillar.png            (Home-Pillar CrossFit)
 *  │   ├── hero.png
 *  │   ├── schedule.png
 *  │   └── community.png
 *  ├── hyrox/
 *  │   ├── hyrox-zone.png        (Home-Pillar Hyrox + Studio)
 *  │   ├── hero.png
 *  │   ├── community.png
 *  │   ├── gallery-1.png
 *  │   ├── gallery-3.png
 *  │   └── gallery-5.png
 *  ├── athletic/
 *  │   ├── hero.png
 *  │   ├── gallery-1.png … gallery-5.png
 *  ├── theke/
 *  │   ├── theke-area.png        (Home-Pillar + Studio)
 *  │   ├── espresso.png
 *  │   ├── lampe.png
 *  │   └── wide.png
 *  └── ueber-uns/
 *      └── mimi-action.png
 */

// ── Logos ─────────────────────────────────────────────────────────────────────
export { default as IMG_LOGO }       from 'figma:asset/25416d75fab01c06b3ba37880c92088e26112f56.png';
export { default as IMG_LOGO_ADMIN } from 'figma:asset/c836b0dc1e8ed6dd71de1118b818ee7b961a2cf5.png';

// ── Team ──────────────────────────────────────────────────────────────────────
export { default as IMG_TEAM_DOME }    from 'figma:asset/284e5d8ca0e490b15fa5e6c243baade9f2c5e58b.png';
export { default as IMG_TEAM_MIMI }    from 'figma:asset/01e56d888ada221139d4cd3ceecf9e84c5b1b489.png';
export { default as IMG_TEAM_BELLA }   from 'figma:asset/186758abe630a88bee123d9214674c4db4c0e1a3.png';
export { default as IMG_TEAM_WILHELM } from 'figma:asset/09670aeabc97c82b7de10ec256887020863e72bf.png';
export { default as IMG_TEAM_LYDI }    from 'figma:asset/967204562f3f0d41ab9c97feb6a34996ff6af024.png';
export { default as IMG_TEAM_JANA }    from 'figma:asset/99cbcf366cae64b5d24c337635adb1f9e3434879.png';
export { default as IMG_TEAM_LEO }     from 'figma:asset/40c3992dc8c9be1044ab34af0be6248aaf203465.png';

// ── Über Uns ──────────────────────────────────────────────────────────────────
export { default as IMG_UEBERUNS_MIMI } from 'figma:asset/24554336b9b4f6e13f6ef2a7f200d6914a979118.png';

// ── Studio / Shared ───────────────────────────────────────────────────────────
export { default as IMG_STUDIO_ENTRANCE }     from 'figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png';
export { default as IMG_STUDIO_CROSSFIT_ZONE} from 'figma:asset/074311f22e30fb140e6274c625d4f86c2eb55278.png';
export { default as IMG_STUDIO_ATHLETIC_ZONE} from 'figma:asset/12f0eb425f227fc6169c67d1390da3067ec74f70.png';
export { default as IMG_STUDIO_DUSCHEN }      from 'figma:asset/f06118a1042cae64d2462baf0c816cd2aa82d64a.png';
export { default as IMG_STUDIO_LEG_DAY }      from 'figma:asset/a75ed35fb9db584ac8784f61a27d15e2e55f72e9.png';

// ── CrossFit ──────────────────────────────────────────────────────────────────
export { default as IMG_CROSSFIT_PILLAR }    from 'figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png';
export { default as IMG_CROSSFIT_HERO }      from 'figma:asset/18f8b000a6830c4e5c290c3ac9791507dff42cb0.png';
export { default as IMG_CROSSFIT_SCHEDULE }  from 'figma:asset/c2ea08b1dc715a3a10fd1069824bb9159588c6a1.png';
export { default as IMG_CROSSFIT_COMMUNITY } from 'figma:asset/35e76d1d2d057faed6dca6fc46b6517adbac4d35.png';

// ── Hyrox ─────────────────────────────────────────────────────────────────────
export { default as IMG_HYROX_ZONE }      from 'figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png';
export { default as IMG_HYROX_HERO }      from 'figma:asset/25ab7f957d222d82bbcb0d0ac4adb54ff41d956e.png';
export { default as IMG_HYROX_COMMUNITY } from 'figma:asset/2fd168ab3eb07b953e192fa2b4e06a5d2814827a.png';
export { default as IMG_HYROX_GALLERY_1 } from 'figma:asset/dddead2f8bc505281b896a452156390eec3ca473.png';
export { default as IMG_HYROX_GALLERY_3 } from 'figma:asset/c8de12aed1af3f1dbef20c85f8eedfdef99cb5b6.png';
export { default as IMG_HYROX_GALLERY_5 } from 'figma:asset/8349c307f48e63096bf0253e1f8dee688878d96e.png';

// ── Athletic Area ─────────────────────────────────────────────────────────────
export { default as IMG_ATHLETIC_HERO }      from 'figma:asset/a3ce98c339ff8c2006773759eeb77a3c43abf78a.png';
export { default as IMG_ATHLETIC_GALLERY_1 } from 'figma:asset/8a0625f157027f7d78a77b8a5fbf3b4b93777f97.png';
export { default as IMG_ATHLETIC_GALLERY_2 } from 'figma:asset/e704c2ac0998162964d3a3daf9a29da8f72c02fb.png';
export { default as IMG_ATHLETIC_GALLERY_3 } from 'figma:asset/7b24826278b15fbc7dc3655d444a32e8e77c4363.png';
export { default as IMG_ATHLETIC_GALLERY_4 } from 'figma:asset/5de102692d016d2b111df6d8ffedcaac846d6cb2.png';
export { default as IMG_ATHLETIC_GALLERY_5 } from 'figma:asset/374ce31108a424a9844144e6efd71e4f725a4976.png';

// ── Theke ─────────────────────────────────────────────────────────────────────
export { default as IMG_THEKE_AREA }     from 'figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png';
export { default as IMG_THEKE_ESPRESSO } from 'figma:asset/9167c06f34c94e5af2c687066a3c86bb94bbfb63.png';
export { default as IMG_THEKE_LAMPE }    from 'figma:asset/bfa8de2895c6f75fb2e41c582089ee11ce2fb86f.png';
export { default as IMG_THEKE_WIDE }     from 'figma:asset/419ac9b5ae50c324b84c8f6b2472a7c7d6346a8e.png';

// ── Hilfsfunktion: figma:asset String → aufgelöster /images/ Pfad ─────────────
// Wird von ASSET_MAP Objekten in Studio.tsx, BlockPreview.tsx etc. genutzt.
// Diese Funktion ist ein direktes Lookup in der Plugin-Tabelle.
const _HASH_TO_PATH: Record<string, string> = {
  '25416d75fab01c06b3ba37880c92088e26112f56.png': '/images/logo/nac-logo.png',
  'c836b0dc1e8ed6dd71de1118b818ee7b961a2cf5.png': '/images/logo/nac-logo-admin.png',
  '284e5d8ca0e490b15fa5e6c243baade9f2c5e58b.png': '/images/team/dome.png',
  '01e56d888ada221139d4cd3ceecf9e84c5b1b489.png': '/images/team/mimi.png',
  '186758abe630a88bee123d9214674c4db4c0e1a3.png': '/images/team/bella.png',
  '09670aeabc97c82b7de10ec256887020863e72bf.png': '/images/team/wilhelm.png',
  '967204562f3f0d41ab9c97feb6a34996ff6af024.png': '/images/team/lydi.png',
  '99cbcf366cae64b5d24c337635adb1f9e3434879.png': '/images/team/jana.png',
  '40c3992dc8c9be1044ab34af0be6248aaf203465.png': '/images/team/leo.png',
  '24554336b9b4f6e13f6ef2a7f200d6914a979118.png': '/images/ueber-uns/mimi-action.png',
  '4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png': '/images/studio/entrance.png',
  '074311f22e30fb140e6274c625d4f86c2eb55278.png': '/images/studio/crossfit-zone.png',
  '12f0eb425f227fc6169c67d1390da3067ec74f70.png': '/images/studio/athletic-zone.png',
  'f06118a1042cae64d2462baf0c816cd2aa82d64a.png': '/images/studio/duschen.png',
  'a75ed35fb9db584ac8784f61a27d15e2e55f72e9.png': '/images/studio/leg-day.png',
  '0056420c6523fcaf0bc63febb2b162354bc9a245.png': '/images/crossfit/pillar.png',
  '4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png': '/images/hyrox/hyrox-zone.png',
  '340d3320565627752ba7f105637cdbc8dc4d4584.png': '/images/theke/theke-area.png',
  '18f8b000a6830c4e5c290c3ac9791507dff42cb0.png': '/images/crossfit/hero.png',
  'c2ea08b1dc715a3a10fd1069824bb9159588c6a1.png': '/images/crossfit/schedule.png',
  '35e76d1d2d057faed6dca6fc46b6517adbac4d35.png': '/images/crossfit/community.png',
  'a3ce98c339ff8c2006773759eeb77a3c43abf78a.png': '/images/athletic/hero.png',
  '8a0625f157027f7d78a77b8a5fbf3b4b93777f97.png': '/images/athletic/gallery-1.png',
  'e704c2ac0998162964d3a3daf9a29da8f72c02fb.png': '/images/athletic/gallery-2.png',
  '7b24826278b15fbc7dc3655d444a32e8e77c4363.png': '/images/athletic/gallery-3.png',
  '5de102692d016d2b111df6d8ffedcaac846d6cb2.png': '/images/athletic/gallery-4.png',
  '374ce31108a424a9844144e6efd71e4f725a4976.png': '/images/athletic/gallery-5.png',
  '25ab7f957d222d82bbcb0d0ac4adb54ff41d956e.png': '/images/hyrox/hero.png',
  '2fd168ab3eb07b953e192fa2b4e06a5d2814827a.png': '/images/hyrox/community.png',
  'dddead2f8bc505281b896a452156390eec3ca473.png': '/images/hyrox/gallery-1.png',
  'c8de12aed1af3f1dbef20c85f8eedfdef99cb5b6.png': '/images/hyrox/gallery-3.png',
  '8349c307f48e63096bf0253e1f8dee688878d96e.png': '/images/hyrox/gallery-5.png',
  '9167c06f34c94e5af2c687066a3c86bb94bbfb63.png': '/images/theke/espresso.png',
  'bfa8de2895c6f75fb2e41c582089ee11ce2fb86f.png': '/images/theke/lampe.png',
  '419ac9b5ae50c324b84c8f6b2472a7c7d6346a8e.png': '/images/theke/wide.png',
};

/**
 * Löst einen "figma:asset/HASH.png" String (wie er in blocks.ts / API-Daten
 * vorkommt) in den stabilen /images/ Pfad auf.
 * Kann auch direkt in ASSET_MAP Definitionen als Wert verwendet werden.
 */
export function resolveImg(figmaAssetUrl: string): string {
  // Schon ein /images/ Pfad → direkt zurückgeben
  if (figmaAssetUrl.startsWith('/images/') || figmaAssetUrl.startsWith('http')) {
    return figmaAssetUrl;
  }
  // figma:asset/HASH.png → hash extrahieren
  const hash = figmaAssetUrl.replace('figma:asset/', '');
  return _HASH_TO_PATH[hash] ?? figmaAssetUrl;
}

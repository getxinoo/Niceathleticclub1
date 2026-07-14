/**
 * predeploy-check.mjs — asset-safety gate (T2B)
 * ─────────────────────────────────────────────────────────────────────────────
 * Run AFTER `npm run build`, BEFORE any deploy. Blocks (exit 1) if the built
 * dist/ or the source assets are unsafe. This is the automated guard against a
 * repeat of the 2026-07-09 Unsplash-fallback production image incident.
 *
 * WHAT THE INCIDENT ACTUALLY WAS: figma:asset IMPORTS (logo, team, studio,
 * pillars) resolved to images.unsplash.com stock photos. The precise, sufficient
 * invariant to prevent recurrence is: no figma:asset key may map to an Unsplash
 * URL, and every canonical brand/team/studio image must exist locally & valid.
 *
 * NOTE on residual Unsplash strings: PAGE_INITIAL_BLOCKS / block seed data still
 * contains some `image:"https://images.unsplash.com/..."` DATA strings. These
 * are (a) frozen content (must not be edited under the current content freeze),
 * and (b) byte-identical in count to the known-good rolled-back live bundle
 * (baseline = 41). They are a SEPARATE content matter, not the asset-build
 * incident. This gate therefore fails only if that count *regresses above the
 * baseline* (a NEW Unsplash reference was introduced), and warns otherwise.
 *
 * Checks:
 *   A (FAIL) figma:asset → unsplash mapping present in dist  [incident signature]
 *   B (FAIL) required canonical images missing/empty/HTML/invalid in public & dist
 *   C (FAIL) dist/index.html missing or references no JS bundle
 *   D (FAIL) images.unsplash.com count in dist EXCEEDS baseline (regression)
 *   D (WARN) images.unsplash.com present at/below baseline (frozen seed data)
 *   E (FAIL) ANY raw "figma:asset/" string in dist text files — unresolved
 *            asset references reached the bundle (signature of the 2026-07-10
 *            production outage; runtime code must compose the prefix
 *            dynamically, see src/lib/images.ts FIGMA_ASSET_PREFIX)
 *   F (FAIL) a /images/... path referenced anywhere in dist text does not
 *            exist as a file in dist (broken canonical reference)
 *   G (FAIL) literal empty/undefined/null img-src patterns in dist text
 *   H (FAIL) dev-mock login credentials present in dist (DEV gate broken)
 *
 * USAGE:  npm run build && npm run predeploy:check
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

// Count of `images.unsplash.com` occurrences in the known-good rolled-back
// production bundle (index.js: 12 + routes.js: 29). The build may not EXCEED
// this — that would mean a new stock reference was introduced.
const UNSPLASH_BASELINE = 41;

const REQUIRED_IMAGES = [
  'images/logo/nac-logo.png',
  'images/logo/nac-logo-admin.png',
  'images/team/dome.png', 'images/team/mimi.png', 'images/team/bella.png',
  'images/team/wilhelm.png', 'images/team/lydi.png', 'images/team/jana.png',
  'images/team/leo.png',
  'images/ueber-uns/mimi-action.png',
  'images/studio/entrance.png', 'images/studio/crossfit-zone.png',
  'images/studio/athletic-zone.png', 'images/studio/duschen.png',
  'images/studio/leg-day.png',
  'images/crossfit/pillar.png', 'images/crossfit/hero.png',
  'images/crossfit/schedule.png', 'images/crossfit/community.png',
  'images/hyrox/hyrox-zone.png', 'images/hyrox/hero.png',
  'images/hyrox/community.png', 'images/hyrox/gallery-1.png',
  'images/hyrox/gallery-3.png', 'images/hyrox/gallery-5.png',
  'images/athletic/hero.png', 'images/athletic/gallery-1.png',
  'images/athletic/gallery-2.png', 'images/athletic/gallery-3.png',
  'images/athletic/gallery-4.png', 'images/athletic/gallery-5.png',
  'images/theke/theke-area.png', 'images/theke/espresso.png',
  'images/theke/lampe.png', 'images/theke/wide.png',
];

const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);

async function walk(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

function detectImage(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'PNG';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'JPEG';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'WEBP';
  if (buf.length >= 6 && (buf.toString('ascii', 0, 5) === 'GIF87' || buf.toString('ascii', 0, 6) === 'GIF89a')) return 'GIF';
  const head = buf.toString('utf8', 0, Math.min(buf.length, 400)).trim().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'SVG';
  return null;
}
function looksLikeHtml(buf) {
  const head = buf.toString('utf8', 0, Math.min(buf.length, 400)).trim().toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}
function countOccurrences(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

async function main() {
  console.log('\n🛡️  Predeploy asset-safety check');
  console.log('══════════════════════════════════════════════');

  try { await stat(DIST); }
  catch { console.error('❌ dist/ not found. Run `npm run build` first.'); process.exit(1); }

  const distFiles = await walk(DIST);
  const textExt = /\.(js|css|html|json|map|txt|xml|svg)$/i;

  // A + D + E + F + G + H: scan dist text for incident signature, Unsplash count,
  // raw unresolved asset strings, referenced /images/-paths, broken src literals
  // and leaked dev-mock credentials. FIGMA_NEEDLE is composed dynamically so this
  // script (and any future copy of the pattern) can never satisfy its own gate by
  // accident.
  const incidentRe = /figma:asset\/[0-9a-f]{40}\.png"\s*:\s*"[^"]*unsplash[^"]*"/i;
  const FIGMA_NEEDLE = ['figma', 'asset/'].join(':');
  const imgRefRe = /\/images\/[A-Za-z0-9_\-./]+?\.(?:png|jpe?g|webp|svg|gif)/g;
  const badSrcRes = [/src=""/, /src="undefined"/, /src="null"/, /src:\s*"undefined"/, /src:\s*"null"/];
  // H: dev-mock credentials must NEVER reach a production bundle. These are the
  // (burned, rotation pending) DEV_MOCK_ACCOUNTS passwords from AuthContext.tsx /
  // api-service.ts, which are import.meta.env.DEV-gated and must be dead-code-
  // eliminated by `vite build`. Split literals so this script itself never
  // contains the greppable secrets.
  const FORBIDDEN_SECRETS = ['NACAdmin' + '2026!', 'Milow' + '2025!'];
  let unsplashCount = 0;
  let figmaRawCount = 0;
  let scanned = 0;
  const referencedImages = new Set();
  for (const f of distFiles) {
    if (!textExt.test(f)) continue;
    scanned++;
    const content = await readFile(f, 'utf8').catch(() => '');
    unsplashCount += countOccurrences(content, 'images.unsplash.com');
    if (incidentRe.test(content)) {
      fail(`INCIDENT SIGNATURE: figma:asset resolves to Unsplash in ${f.replace(DIST, 'dist')}`);
    }
    // E: raw unresolved asset prefix anywhere in built output → hard fail
    const rawHits = countOccurrences(content, FIGMA_NEEDLE);
    if (rawHits > 0) {
      figmaRawCount += rawHits;
      fail(`RAW ${FIGMA_NEEDLE} string (${rawHits}x) in ${f.replace(DIST, 'dist')} — unresolved asset reference in bundle`);
    }
    // F: collect every referenced /images/... path for the existence check
    for (const m of content.matchAll(imgRefRe)) referencedImages.add(m[0]);
    // G: literal broken src patterns
    for (const re of badSrcRes) {
      if (re.test(content)) {
        fail(`Broken src literal (${re.source}) in ${f.replace(DIST, 'dist')}`);
      }
    }
    // H: dev-mock credential strings must never appear in a production bundle
    for (const secret of FORBIDDEN_SECRETS) {
      if (content.includes(secret)) {
        fail(`DEV-MOCK CREDENTIAL "${secret.slice(0, 4)}…" leaked into ${f.replace(DIST, 'dist')} ` +
          `— import.meta.env.DEV gate is broken. NEVER deploy this build.`);
      }
    }
  }

  // F: every referenced /images/... path must exist as a real file in dist
  let missingRefCount = 0;
  for (const rel of referencedImages) {
    try { await stat(join(DIST, rel)); }
    catch { missingRefCount++; fail(`Referenced image missing in dist: ${rel}`); }
  }

  // C: index.html sanity
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8').catch(() => '');
  if (!indexHtml || !/\/assets\/[^"]+\.js/.test(indexHtml)) {
    fail('dist/index.html missing or does not reference a JS bundle');
  }

  // B: required images present + valid in public/ and dist/
  for (const rel of REQUIRED_IMAGES) {
    for (const [base, label] of [[PUBLIC, 'public'], [DIST, 'dist']]) {
      const full = join(base, rel);
      let size = 0;
      try { size = (await stat(full)).size; }
      catch { fail(`${label}/${rel} MISSING`); continue; }
      if (size === 0) { fail(`${label}/${rel} EMPTY`); continue; }
      const buf = await readFile(full);
      if (looksLikeHtml(buf)) { fail(`${label}/${rel} is an HTML fallback, not an image`); continue; }
      if (!detectImage(buf)) fail(`${label}/${rel} not a valid image (bad magic bytes)`);
    }
  }

  // D: Unsplash regression guard
  if (unsplashCount > UNSPLASH_BASELINE) {
    fail(`images.unsplash.com count ${unsplashCount} EXCEEDS baseline ${UNSPLASH_BASELINE} ` +
      `— a NEW stock reference was introduced. Investigate before deploy.`);
  } else if (unsplashCount > 0) {
    warn(`images.unsplash.com appears ${unsplashCount}× in dist (baseline ${UNSPLASH_BASELINE}, ` +
      `not exceeded). These are frozen block-seed DATA strings, identical to the known-good ` +
      `live bundle — NOT the figma-import incident. Track separately: scrub Unsplash from ` +
      `PAGE_INITIAL_BLOCKS seed data under a content-freeze-approved ticket.`);
  }

  console.log(`   dist text files scanned:        ${scanned}`);
  console.log(`   figma:asset → Unsplash mappings: ${failures.filter(f => f.includes('INCIDENT')).length} (must be 0)`);
  console.log(`   raw ${FIGMA_NEEDLE} strings in dist: ${figmaRawCount} (must be 0)`);
  console.log(`   images.unsplash.com count:       ${unsplashCount} (baseline ${UNSPLASH_BASELINE})`);
  console.log(`   dev-mock credential leaks:       ${failures.filter(f => f.includes('DEV-MOCK')).length} (must be 0)`);
  console.log(`   required images checked:         ${REQUIRED_IMAGES.length} (× public + dist)`);
  console.log(`   referenced /images/ paths:       ${referencedImages.size} (${missingRefCount} missing)`);

  if (warnings.length) {
    console.log(`\n⚠️  Warnings (${warnings.length}) — non-blocking:`);
    for (const w of warnings) console.log(`   • ${w}`);
  }

  if (failures.length) {
    console.error(`\n❌ PREDEPLOY CHECK FAILED — ${failures.length} problem(s):`);
    for (const m of failures) console.error(`   ✗ ${m}`);
    console.error('\nDo NOT deploy this build.\n');
    process.exit(1);
  }
  console.log('\n✅ PREDEPLOY CHECK PASSED — no figma-import→stock leakage; canonical assets ' +
    'present & valid. Safe to consider deploy (with approval + screenshot gate).\n');
}

main().catch((err) => {
  console.error('\n❌ Predeploy check error:', err.message);
  process.exit(1);
});

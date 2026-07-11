/**
 * dev-pages-api.mjs – Lokale, PERSISTENTE Entwicklungs-API (Node, ohne Deps)
 * ─────────────────────────────────────────────────────────────────────────────
 * Spiegelt die für den CMS-Roundtrip relevanten PHP-Endpunkte semantisch
 * (Antwortformen wie json_success/json_error in api/config.php – rohe
 * JSON-Payloads, Fehler als {error}), damit Veröffentlichen/Neu-Laden/
 * Zweit-Browser-Tests OHNE Produktions-Traffic möglich sind:
 *
 *   GET  /api/pages.php               → Seitenliste (Meta)
 *   GET  /api/pages.php?slug=X        → Seite (nur published; 404 sonst)
 *   GET  /api/pages.php?slug=X&admin=1→ Seite inkl. draft (Auth nötig)
 *   PUT  /api/pages.php?slug=X        → Blöcke speichern (Auth nötig)
 *   GET  /api/pricing.php[?admin=1]   → Pricing-Rohdaten (Admin: Auth)
 *   POST /api/pricing.php?action=...  → save_plans|save_addons|save_notes (Auth)
 *   GET  /api/public/pricing.php?page=X → komponierte Public-Payload
 *
 * Auth-Simulation: PUT/POST/admin-GET verlangen einen Authorization: Bearer
 * Header (Inhalt egal) – ohne Header antwortet der Server mit 401 wie das
 * echte Backend. NIEMALS gegen Produktion richten; Store liegt als JSON-Datei
 * im Session-Scratchpad (oder $DEV_API_STORE).
 *
 * Start:  node scripts/dev-pages-api.mjs [port]   (Default 4599)
 * Build:  VITE_API_BASE_URL=http://localhost:4599/api npm run build
 */

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const PORT = Number(process.argv[2] || process.env.DEV_API_PORT || 4599);
const STORE_PATH =
  process.env.DEV_API_STORE ||
  join(tmpdir(), "nac-dev-api", "store.json");

// ── Store ─────────────────────────────────────────────────────────────────────
function loadStore() {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8"));
  } catch {
    return { pages: {}, pricing: null, notes: { contract: "", blaulicht: "" } };
  }
}
function saveStore(store) {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}
let store = loadStore();

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function send(res, code, payload) {
  const body = JSON.stringify(payload, null, 1);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=UTF-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(body);
}
const ok = (res, data) => send(res, 200, data);
const err = (res, code, message) => send(res, code, { error: message });

function requireAuth(req, res) {
  const auth = req.headers["authorization"] || "";
  if (!auth.startsWith("Bearer ") || auth.length < 12) {
    err(res, 401, "Nicht autorisiert (Dev-API: Authorization: Bearer <token> erforderlich).");
    return false;
  }
  return true;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return null; }
}

// ── pages.php ────────────────────────────────────────────────────────────────
function pageMeta(slug, p) {
  return { slug, title: p.title ?? slug, metaDescription: p.metaDescription ?? "", status: p.status, updatedAt: p.updatedAt };
}
function fullPage(slug, p) {
  return { ...pageMeta(slug, p), blocks: p.blocks ?? [], published: p.status === "published" };
}

async function handlePages(req, res, url) {
  const slug = url.searchParams.get("slug")?.trim() || null;
  const action = url.searchParams.get("action");
  const isAdmin = url.searchParams.get("admin") === "1";

  if (req.method === "GET") {
    if (isAdmin && !requireAuth(req, res)) return;
    if (!slug) {
      return ok(res, Object.entries(store.pages).map(([s, p]) => pageMeta(s, p)));
    }
    const page = store.pages[slug];
    if (!page || (!isAdmin && page.status !== "published")) {
      return err(res, 404, "Seite nicht oeffentlich sichtbar oder nicht vorhanden.");
    }
    if (action === "blocks") {
      return ok(res, { blocks: page.blocks ?? [], status: page.status, published: page.status === "published" });
    }
    return ok(res, fullPage(slug, page));
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    if (body === null) return err(res, 400, "Ungültiger JSON-Body.");
    const effSlug = slug || (typeof body.slug === "string" ? body.slug.trim() : "");
    if (!effSlug) return err(res, 400, 'Parameter "slug" fehlt.');

    const existing = store.pages[effSlug] ?? { title: effSlug, status: "draft", blocks: [] };

    if (req.method === "PUT") {
      if (!Array.isArray(body.blocks)) return err(res, 400, '"blocks" muss ein JSON-Array sein.');
      for (const [i, b] of body.blocks.entries()) {
        if (!b?.id || !b?.type) return err(res, 400, `Block #${i}: 'id' und 'type' sind Pflichtfelder.`);
      }
      const confirmEmpty = !!body.allow_empty_blocks || !!body.confirmEmpty;
      if (body.blocks.length === 0 && !confirmEmpty && (existing.blocks?.length ?? 0) > 0) {
        return err(res, 409, "Leeres Blocks-Array wird nicht ohne Bestaetigung gespeichert.");
      }
      let status = existing.status;
      if (body.status !== undefined) {
        if (!["draft", "published"].includes(body.status)) return err(res, 400, 'Ungueltiger Wert fuer "status".');
        status = body.status;
      } else if (body.published !== undefined) {
        status = body.published ? "published" : "draft";
      }
      store.pages[effSlug] = { ...existing, blocks: body.blocks, status, updatedAt: new Date().toISOString() };
    } else {
      const patch = {};
      if (typeof body.title === "string") patch.title = body.title;
      if (typeof body.meta_description === "string") patch.metaDescription = body.meta_description;
      if (body.status !== undefined) {
        if (!["draft", "published"].includes(body.status)) return err(res, 400, 'Ungueltiger Wert fuer "status".');
        patch.status = body.status;
      }
      if (!Object.keys(patch).length) return err(res, 400, "Keine gueltigen Felder zum Aktualisieren uebergeben.");
      store.pages[effSlug] = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    }
    saveStore(store);
    return ok(res, fullPage(effSlug, store.pages[effSlug]));
  }

  return err(res, 405, "Methode nicht erlaubt.");
}

// ── pricing.php (Rohdaten) + public/pricing.php (komponiert) ────────────────
function defaultPricing() {
  return { basePlans: [], addOns: [] };
}

async function handlePricing(req, res, url) {
  const action = url.searchParams.get("action") || "";
  const isAdmin = url.searchParams.get("admin") === "1";

  if (req.method === "GET") {
    if (isAdmin && !requireAuth(req, res)) return;
    const p = store.pricing ?? defaultPricing();
    const filterActive = (arr) => (isAdmin ? arr : arr.filter((x) => x.active !== false));
    return ok(res, {
      basePlans: filterActive(p.basePlans ?? []),
      addOns: filterActive(p.addOns ?? []),
      contractNote: store.notes?.contract ?? "",
      blaulichtNote: store.notes?.blaulicht ?? "",
    });
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    if (body === null) return err(res, 400, "Ungültiger JSON-Body.");
    store.pricing = store.pricing ?? defaultPricing();

    if (action === "save_addons") {
      if (!Array.isArray(body.addOns)) return err(res, 422, "addOns Array erwartet.");
      // Validierung analog api/pricing.php (Längen, Rows, Sortierung)
      for (const [i, a] of body.addOns.entries()) {
        if (typeof (a.name ?? "") !== "string" || (a.name ?? "").length > 120) {
          return err(res, 422, `Add-on #${i}: name fehlt oder zu lang (max 120).`);
        }
        for (const [oi, o] of (a.options ?? []).entries()) {
          const left = o.leftText ?? o.label ?? "";
          const right = o.rightText ?? (o.price !== undefined ? `+${o.price}€` : "");
          if (String(left).length > 120 || String(right).length > 120) {
            return err(res, 422, `Add-on #${i} Option #${oi}: Text zu lang (max 120).`);
          }
        }
      }
      store.pricing.addOns = body.addOns;
      saveStore(store);
      return ok(res, { message: `${body.addOns.length} Add-ons gespeichert.` });
    }
    if (action === "save_plans") {
      if (Array.isArray(body.basePlans)) {
        store.pricing.basePlans = body.basePlans;
        saveStore(store);
        return ok(res, { message: `${body.basePlans.length} Tarife gespeichert.` });
      }
      return err(res, 422, "basePlans Array erwartet (Dev-API unterstützt nur Bulk).");
    }
    if (action === "save_notes") {
      store.notes = { contract: body.contractNote ?? "", blaulicht: body.blaulichtNote ?? "" };
      saveStore(store);
      return ok(res, { message: "Notizen gespeichert." });
    }
    return err(res, 400, `Unbekannte Action: ${action}`);
  }

  return err(res, 405, "Methode nicht erlaubt.");
}

function handlePublicPricing(req, res, url) {
  const page = url.searchParams.get("page") || "preise";
  const p = store.pricing ?? defaultPricing();
  const active = (arr) => (arr ?? []).filter((x) => x.active !== false);
  const plans = active(p.basePlans).map((bp, i) => ({
    id: i + 1,
    slug: bp.id ?? `plan-${i}`,
    name: bp.name ?? "",
    price: Number(bp.price ?? 0),
    period: bp.period ?? "pro Monat",
    description: bp.description ?? "",
    features: bp.features ?? [],
    badge_text: bp.badge ?? null,
    is_featured: !!bp.highlight,
    show_cta: true,
    cta_text: bp.cta ?? "Jetzt starten",
    cta_url: "/probetraining",
    restrictions: bp.restrictions ?? null,
    blaulicht_discount: bp.blaulichtDiscount ?? null,
    student_price: bp.studentPrice ?? null,
    sort_order: bp.sortOrder ?? i,
  }));
  const addons = active(p.addOns).map((a, i) => ({
    id: i + 1,
    slug: a.id ?? `addon-${i}`,
    name: a.name ?? "",
    description: a.description ?? null,
    icon: a.icon ?? null,
    options: (a.options ?? [])
      .filter((o) => o.visible !== false)
      .map((o) => ({
        label: o.leftText ?? o.label ?? "",
        price: Number(o.price ?? 0),
        leftText: o.leftText ?? o.label ?? "",
        rightText: o.rightText ?? (o.price !== undefined ? `+${o.price}€` : ""),
        description: o.description ?? null,
      })),
    sort_order: a.sortOrder ?? i,
  }));
  return ok(res, { page, plans, addons, notices: [], comparison: null, pros_cons: null });
}

// ── Router ────────────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "");
  try {
    if (path === "/api/pages.php" || path === "/api/pages") return await handlePages(req, res, url);
    if (path === "/api/pricing.php" || path === "/api/pricing") return await handlePricing(req, res, url);
    if (path === "/api/public/pricing.php" || path === "/api/public/pricing") return handlePublicPricing(req, res, url);
    return err(res, 404, `Dev-API: Endpunkt nicht implementiert: ${path}`);
  } catch (e) {
    return err(res, 500, `Dev-API Fehler: ${e.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`[dev-pages-api] http://localhost:${PORT}/api  ·  Store: ${STORE_PATH}`);
});

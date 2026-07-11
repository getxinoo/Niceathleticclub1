<?php
/**
 * pages.php – CMS-Seiten API
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/pages.php                                → Alle Seiten auflisten (oeffentlich, nur published)
 * GET    /api/pages.php?admin=1                         → Alle Seiten auflisten inkl. draft (Auth noetig)
 * GET    /api/pages.php?slug=home                       → Einzelne Seite laden (nur status=published, sonst 404)
 * GET    /api/pages.php?slug=home&admin=1               → Einzelne Seite laden (Auth noetig, auch draft)
 * GET    /api/pages.php?slug=home&action=blocks         → Block-Liste laden (nur published, sonst 404)
 * GET    /api/pages.php?slug=home&action=blocks&admin=1 → Block-Liste laden (Auth noetig, auch draft)
 * PUT    /api/pages.php?slug=home                       → Block-Liste (+ optional Meta) speichern (Auth erforderlich)
 * PATCH  /api/pages.php?slug=home                       → Seiten-Meta aktualisieren (Auth erforderlich)
 * DELETE /api/pages.php?slug=home                       → Nicht unterstuetzt (Auth erforderlich, dann 405)
 *
 * CMS-Status ist verbindlich: status=published -> oeffentlich sichtbar, status=draft -> nur im Admin sichtbar.
 * pages.status ist die EINZIGE Quelle fuer Sichtbarkeit (kein page_visibility-Table-Override mehr).
 */

declare(strict_types=1);
require_once 'config.php';

$method     = $_SERVER['REQUEST_METHOD'];
$slug       = isset($_GET['slug']) ? trim($_GET['slug']) : null;
$action     = isset($_GET['action']) ? trim($_GET['action']) : null;
$isAdminReq = isset($_GET['admin']) && $_GET['admin'] === '1';

// Body einmalig lesen (PUT/PATCH) – Frontend schickt slug teils nur im Body statt in der Query.
$body = null;
if ($method === 'PUT' || $method === 'PATCH') {
    $body = get_body();
    if (($slug === null || $slug === '') && isset($body['slug']) && is_string($body['slug']) && trim($body['slug']) !== '') {
        $slug = trim($body['slug']);
    }
}

switch ($method) {
    case 'GET':
        if ($slug !== null && $slug !== '') {
            if ($isAdminReq) {
                require_permission('cms.manage'); // P1 Security-Hotfix: CMS-Publish/Admin-Read = cms.manage
                $action === 'blocks' ? get_page_blocks($slug, true) : get_page($slug, true);
            } else {
                $action === 'blocks' ? get_page_blocks($slug, false) : get_page($slug, false);
            }
        } else {
            if ($isAdminReq) {
                require_permission('cms.manage'); // P1 Security-Hotfix: CMS-Publish/Admin-Read = cms.manage
            }
            list_pages();
        }
        break;

    case 'PUT':
        require_permission('cms.manage'); // P1 Security-Hotfix: CMS-Publish/Admin-Read = cms.manage
        if ($slug === null || $slug === '') json_error('Parameter "slug" fehlt.');
        save_page_blocks($slug, $body ?? []);
        break;

    case 'PATCH':
        require_permission('cms.manage'); // P1 Security-Hotfix: CMS-Publish/Admin-Read = cms.manage
        if ($slug === null || $slug === '') json_error('Parameter "slug" fehlt.');
        update_page_meta($slug, $body ?? []);
        break;

    case 'DELETE':
        // Auth immer zuerst pruefen (auch wenn Loeschen aktuell nicht unterstuetzt wird).
        require_permission('cms.manage'); // P1 Security-Hotfix: CMS-Publish/Admin-Read = cms.manage
        json_error('Loeschen von Seiten wird nicht unterstuetzt.', 405);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Alle Seiten auflisten ────────────────────────────────────────────
// Oeffentlich: nur sichere Metadaten (kein "blocks"-Content), aber fuer ALLE
// Status-Werte (auch draft) – so kann das Frontend aus pages.status eine
// vollstaendige Sichtbarkeits-Map bauen, ohne Seiteninhalte preiszugeben.
function list_pages(): void
{
    $stmt = db()->query(
        'SELECT slug, title, meta_description AS metaDescription,
                status, updated_at AS updatedAt
         FROM pages
         ORDER BY id ASC'
    );
    json_success($stmt->fetchAll());
}

// ── Handler: Einzelne Seite ───────────────────────────────────────────────────
function get_page(string $slug, bool $isAdmin): void
{
    $stmt = db()->prepare(
        'SELECT slug, title, meta_description AS metaDescription,
                blocks, status, updated_at AS updatedAt
         FROM pages
         WHERE slug = ?'
    );
    $stmt->execute([$slug]);
    $page = $stmt->fetch();

    if (!$page || (!$isAdmin && $page['status'] !== 'published')) {
        json_error('Seite nicht oeffentlich sichtbar oder nicht vorhanden.', 404);
    }

    $page['blocks']    = json_decode($page['blocks'] ?? '[]', true) ?? [];
    $page['published'] = $page['status'] === 'published';
    json_success($page);
}

// ── Handler: Block-Liste laden ────────────────────────────────────────────────
function get_page_blocks(string $slug, bool $isAdmin): void
{
    $stmt = db()->prepare('SELECT blocks, status FROM pages WHERE slug = ?');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();

    if (!$row || (!$isAdmin && $row['status'] !== 'published')) {
        json_error('Seite nicht oeffentlich sichtbar oder nicht vorhanden.', 404);
    }

    $blocks = json_decode($row['blocks'] ?? '[]', true) ?? [];
    json_success([
        'blocks'    => $blocks,
        'status'    => $row['status'],
        'published' => $row['status'] === 'published',
    ]);
}

// ── Handler: Block-Liste speichern (Sitebuilder PUT) ─────────────────────────
function save_page_blocks(string $slug, array $body): void
{
    if (!isset($body['blocks']) || !is_array($body['blocks'])) {
        json_error('"blocks" muss ein JSON-Array sein.');
    }

    // Jeden Block minimal validieren
    foreach ($body['blocks'] as $idx => $block) {
        if (empty($block['id']) || empty($block['type'])) {
            json_error("Block #{$idx}: 'id' und 'type' sind Pflichtfelder.");
        }
    }

    // Sicherheitsnetz: kein versehentliches Ueberschreiben einer befuellten Seite
    // mit einem leeren Array, ausser der Admin bestaetigt dies bewusst.
    $confirmEmpty = !empty($body['allow_empty_blocks']) || !empty($body['confirmEmpty']);
    if (count($body['blocks']) === 0 && !$confirmEmpty) {
        $check = db()->prepare('SELECT blocks FROM pages WHERE slug = ?');
        $check->execute([$slug]);
        $existing = $check->fetch();
        if ($existing) {
            $existingBlocks = json_decode($existing['blocks'] ?? '[]', true) ?? [];
            if (count($existingBlocks) > 0) {
                json_error(
                    'Leeres Blocks-Array wird nicht ohne Bestaetigung gespeichert. ' .
                    'Sende "allow_empty_blocks": true, um dies bewusst zu erzwingen.',
                    409
                );
            }
        }
    }

    // Status: bevorzugt explizites "status", sonst aus "published" (bool) ableiten.
    if (isset($body['status'])) {
        if (!in_array($body['status'], ['draft', 'published'], true)) {
            json_error('Ungueltiger Wert fuer "status". Erlaubt: draft | published.');
        }
        $status = $body['status'];
    } else {
        $status = isset($body['published']) && $body['published'] ? 'published' : 'draft';
    }

    $blocks_json = json_encode(
        $body['blocks'],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    // Optionale Meta-Felder (title / meta_description) im selben Request mitpflegen.
    $fields = ['blocks = ?', 'status = ?'];
    $values = [$blocks_json, $status];

    if (isset($body['title']) && is_string($body['title'])) {
        $fields[] = 'title = ?';
        $values[] = $body['title'];
    }
    if (isset($body['meta_description']) && is_string($body['meta_description'])) {
        $fields[] = 'meta_description = ?';
        $values[] = $body['meta_description'];
    }

    $values[] = $slug;
    $stmt = db()->prepare(
        'UPDATE pages SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE slug = ?'
    );
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) {
        $check = db()->prepare('SELECT id FROM pages WHERE slug = ?');
        $check->execute([$slug]);
        if (!$check->fetch()) {
            json_error('Seite nicht gefunden.', 404);
        }
    }

    respond_with_full_page($slug);
}

// ── Handler: Meta-Daten aktualisieren (PATCH) ────────────────────────────────
function update_page_meta(string $slug, array $body): void
{
    $allowed = ['title', 'meta_description', 'status'];
    $fields  = [];
    $values  = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            // Status-Whitelist
            if ($field === 'status' && !in_array($body[$field], ['draft', 'published'], true)) {
                json_error('Ungueltiger Wert fuer "status". Erlaubt: draft | published.');
            }
            $fields[] = "{$field} = ?";
            $values[] = $body[$field];
        }
    }

    if (empty($fields)) {
        json_error('Keine gueltigen Felder zum Aktualisieren uebergeben.');
    }

    $values[] = $slug;
    $stmt     = db()->prepare(
        'UPDATE pages SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE slug = ?'
    );
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) {
        $check = db()->prepare('SELECT id FROM pages WHERE slug = ?');
        $check->execute([$slug]);
        if (!$check->fetch()) {
            json_error('Seite nicht gefunden.', 404);
        }
    }

    respond_with_full_page($slug);
}

// ── Helper: Vollstaendige Seite nach Save zurueckgeben ───────────────────────
function respond_with_full_page(string $slug): void
{
    $stmt = db()->prepare(
        'SELECT slug, title, meta_description AS metaDescription,
                blocks, status, updated_at AS updatedAt
         FROM pages WHERE slug = ?'
    );
    $stmt->execute([$slug]);
    $page = $stmt->fetch();
    if ($page) {
        $page['blocks']    = json_decode($page['blocks'] ?? '[]', true) ?? [];
        $page['published'] = $page['status'] === 'published';
    }
    json_success($page);
}

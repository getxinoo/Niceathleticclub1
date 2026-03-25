<?php
/**
 * pages.php – CMS-Seiten API
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/pages.php                        → Alle Seiten auflisten
 * GET  /api/pages.php?slug=home              → Einzelne Seite laden
 * GET  /api/pages.php?slug=home&action=blocks → Block-Liste laden (Sitebuilder)
 * PUT  /api/pages.php?slug=home              → Block-Liste speichern + Status
 * PATCH /api/pages.php?slug=home             → Seiten-Meta aktualisieren
 */

declare(strict_types=1);
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$slug   = isset($_GET['slug']) ? trim($_GET['slug']) : null;
$action = isset($_GET['action']) ? trim($_GET['action']) : null;

switch ($method) {
    case 'GET':
        if ($slug !== null) {
            $action === 'blocks' ? get_page_blocks($slug) : get_page($slug);
        } else {
            list_pages();
        }
        break;

    case 'PUT':
        if ($slug === null) json_error('Parameter "slug" fehlt.');
        save_page_blocks($slug);
        break;

    case 'PATCH':
        if ($slug === null) json_error('Parameter "slug" fehlt.');
        update_page_meta($slug);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Alle Seiten auflisten ────────────────────────────────────────────
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
function get_page(string $slug): void
{
    $stmt = db()->prepare(
        'SELECT slug, title, meta_description AS metaDescription,
                blocks, status, updated_at AS updatedAt
         FROM pages
         WHERE slug = ?'
    );
    $stmt->execute([$slug]);
    $page = $stmt->fetch();

    if (!$page) {
        json_error('Seite nicht gefunden.', 404);
    }

    $page['blocks'] = json_decode($page['blocks'] ?? '[]', true) ?? [];
    json_success($page);
}

// ── Handler: Block-Liste laden ────────────────────────────────────────────────
function get_page_blocks(string $slug): void
{
    $stmt = db()->prepare('SELECT blocks FROM pages WHERE slug = ?');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();

    if (!$row) {
        json_error('Seite nicht gefunden.', 404);
    }

    $blocks = json_decode($row['blocks'] ?? '[]', true) ?? [];
    json_success($blocks);
}

// ── Handler: Block-Liste speichern (Sitebuilder PUT) ─────────────────────────
function save_page_blocks(string $slug): void
{
    $body = get_body();

    if (!isset($body['blocks']) || !is_array($body['blocks'])) {
        json_error('"blocks" muss ein JSON-Array sein.');
    }

    // Jeden Block minimal validieren
    foreach ($body['blocks'] as $idx => $block) {
        if (empty($block['id']) || empty($block['type'])) {
            json_error("Block #{$idx}: 'id' und 'type' sind Pflichtfelder.");
        }
    }

    $status      = isset($body['published']) && $body['published'] ? 'published' : 'draft';
    $blocks_json = json_encode(
        $body['blocks'],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    $stmt = db()->prepare(
        'UPDATE pages
         SET blocks = ?, status = ?, updated_at = NOW()
         WHERE slug = ?'
    );
    $stmt->execute([$blocks_json, $status, $slug]);

    if ($stmt->rowCount() === 0) {
        // Prüfen ob Seite existiert oder wirklich keine Änderung
        $check = db()->prepare('SELECT id FROM pages WHERE slug = ?');
        $check->execute([$slug]);
        if (!$check->fetch()) {
            json_error('Seite nicht gefunden.', 404);
        }
    }

    // Aktualisierten Datensatz zurückgeben
    $stmt2 = db()->prepare(
        'SELECT slug, title, meta_description AS metaDescription,
                status, updated_at AS updatedAt
         FROM pages WHERE slug = ?'
    );
    $stmt2->execute([$slug]);
    json_success($stmt2->fetch());
}

// ── Handler: Meta-Daten aktualisieren (PATCH) ────────────────────────────────
function update_page_meta(string $slug): void
{
    $body    = get_body();
    $allowed = ['title', 'meta_description', 'status'];
    $fields  = [];
    $values  = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            // Status-Whitelist
            if ($field === 'status' && !in_array($body[$field], ['draft', 'published'], true)) {
                json_error('Ungültiger Wert für "status". Erlaubt: draft | published.');
            }
            $fields[] = "{$field} = ?";
            $values[] = $body[$field];
        }
    }

    if (empty($fields)) {
        json_error('Keine gültigen Felder zum Aktualisieren übergeben.');
    }

    $values[] = $slug;
    $stmt     = db()->prepare(
        'UPDATE pages SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE slug = ?'
    );
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) {
        json_error('Seite nicht gefunden.', 404);
    }

    $stmt2 = db()->prepare(
        'SELECT slug, title, meta_description AS metaDescription,
                status, updated_at AS updatedAt
         FROM pages WHERE slug = ?'
    );
    $stmt2->execute([$slug]);
    json_success($stmt2->fetch());
}

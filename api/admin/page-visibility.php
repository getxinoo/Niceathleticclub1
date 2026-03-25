<?php
/**
 * page-visibility.php – Seitensichtbarkeit & Nav-Overrides
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  → Alle Sichtbarkeits-Einstellungen laden
 * PUT  → Sichtbarkeits-Einstellungen speichern (Bulk-Upsert)
 *
 * Berechtigung: cms.manage
 * PHP 7.4 kompatibel – kein str_contains(), kein match, keine named args
 * MySQL 5.7 kompatibel – kein ADD COLUMN IF NOT EXISTS
 */

require_once __DIR__ . '/../config.php';

$actor  = require_permission('cms.manage');
$method = $_SERVER['REQUEST_METHOD'];

// ── Tabelle automatisch anlegen (idempotent) ─────────────────────────────────
function ensure_table()
{
    $pdo = db();
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS page_visibility (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            slug              VARCHAR(100)  NOT NULL,
            visible           TINYINT(1)    NOT NULL DEFAULT 1,
            nav_override_href VARCHAR(255)  DEFAULT NULL,
            nav_override_label VARCHAR(100) DEFAULT NULL,
            updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by        INT           DEFAULT NULL,
            UNIQUE KEY uq_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

// ── Slug → Nav-Href Mapping (server-seitig, identisch zum Frontend) ─────────
function slug_to_nav_href($slug)
{
    $map = array(
        'studio'   => '/studio',
        'kurse'    => '/kurse',
        'preise'   => '/preise',
        'team'     => '/team',
        'kontakt'  => '/kontakt',
    );
    return isset($map[$slug]) ? $map[$slug] : null;
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET – Alle Sichtbarkeits-Einstellungen laden
// ══════════════════════════════════════════════════════════════════════════════
if ($method === 'GET') {
    ensure_table();
    $pdo  = db();
    $rows = $pdo->query("SELECT slug, visible, nav_override_href, nav_override_label FROM page_visibility")->fetchAll();

    $visibility   = array();
    $navOverrides = array();

    foreach ($rows as $row) {
        $visibility[$row['slug']] = (int)$row['visible'] === 1;

        // Nav-Override nur senden wenn tatsaechlich gesetzt
        if (!empty($row['nav_override_href'])) {
            $navHref = slug_to_nav_href($row['slug']);
            if ($navHref === null) {
                $navHref = '/' . $row['slug'];
            }
            $override = array(
                'navHref'    => $navHref,
                'customHref' => $row['nav_override_href'],
            );
            if (!empty($row['nav_override_label'])) {
                $override['customLabel'] = $row['nav_override_label'];
            }
            $navOverrides[$navHref] = $override;
        }
    }

    json_success(array(
        'visibility'   => $visibility,
        'navOverrides' => $navOverrides,
    ));
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUT – Sichtbarkeits-Einstellungen speichern (Bulk-Upsert)
// ══════════════════════════════════════════════════════════════════════════════
if ($method === 'PUT') {
    ensure_table();
    $body       = get_body();
    $visibility   = isset($body['visibility'])   ? (array)$body['visibility']   : array();
    $navOverrides = isset($body['navOverrides']) ? (array)$body['navOverrides'] : array();
    $user_id      = isset($actor['sub']) ? (int)$actor['sub'] : null;

    $pdo = db();

    // Nav-Href → Slug reverse map
    $nav_to_slug = array(
        '/studio'  => 'studio',
        '/kurse'   => 'kurse',
        '/preise'  => 'preise',
        '/team'    => 'team',
        '/kontakt' => 'kontakt',
    );

    // Override-Daten nach Slug indexieren
    $overrides_by_slug = array();
    foreach ($navOverrides as $navHref => $override) {
        $slug = isset($nav_to_slug[$navHref]) ? $nav_to_slug[$navHref] : null;
        // Fallback: Slug aus navHref extrahieren (z.B. "/studio" → "studio")
        if ($slug === null && isset($override['navHref'])) {
            $slug = isset($nav_to_slug[$override['navHref']]) ? $nav_to_slug[$override['navHref']] : ltrim($override['navHref'], '/');
        }
        if ($slug !== null) {
            $overrides_by_slug[$slug] = $override;
        }
    }

    // Alle Slugs sammeln (aus visibility + overrides)
    $all_slugs = array_unique(array_merge(array_keys($visibility), array_keys($overrides_by_slug)));

    $pdo->beginTransaction();
    try {
        // Bestehende Eintraege loeschen und neu einfuegen (einfacher als Upsert auf MySQL 5.7)
        $pdo->exec("DELETE FROM page_visibility");

        $stmt = $pdo->prepare("
            INSERT INTO page_visibility (slug, visible, nav_override_href, nav_override_label, updated_by)
            VALUES (?, ?, ?, ?, ?)
        ");

        $changes = array();
        foreach ($all_slugs as $slug) {
            $vis     = isset($visibility[$slug]) ? ($visibility[$slug] ? 1 : 0) : 1;
            $ovHref  = null;
            $ovLabel = null;
            if (isset($overrides_by_slug[$slug])) {
                $ov = $overrides_by_slug[$slug];
                $ovHref  = isset($ov['customHref'])  ? $ov['customHref']  : null;
                $ovLabel = isset($ov['customLabel']) ? $ov['customLabel'] : null;
            }

            $stmt->execute(array($slug, $vis, $ovHref, $ovLabel, $user_id));
            $changes[$slug] = array('visible' => (bool)$vis, 'override' => $ovHref);
        }

        $pdo->commit();

        // Audit-Log
        audit_log(
            $actor,
            'page_visibility_update',
            'page_visibility',
            'bulk',
            array(
                'pages_affected' => count($all_slugs),
                'changes'        => $changes,
            ),
            'info',
            'admin_ui'
        );

        json_success(array(
            'success' => true,
            'message' => 'Sichtbarkeit gespeichert',
            'affected' => count($all_slugs),
        ));
    } catch (\Throwable $e) {
        $pdo->rollBack();
        json_error('Fehler beim Speichern: ' . $e->getMessage(), 500);
    }
}

// ── Unbekannte Methode ───────────────────────────────────────────────────────
json_error('Methode nicht erlaubt', 405);

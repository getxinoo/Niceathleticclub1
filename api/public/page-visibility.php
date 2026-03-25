<?php
/**
 * public/page-visibility.php – Oeffentlicher Sichtbarkeits-Endpoint (kein Auth)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  → Alle Sichtbarkeits-Einstellungen laden (fuer Navbar/Footer-Filterung)
 *
 * Cacheable: Browser darf 60s cachen (Cache-Control Header).
 * PHP 7.4 kompatibel.
 */

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Methode nicht erlaubt', 405);
}

// Cache-Control: Ergebnis darf 60 Sekunden gecacht werden
header('Cache-Control: public, max-age=60, s-maxage=120');

$pdo = db();

// Tabelle existiert vielleicht noch nicht
try {
    $rows = $pdo->query("SELECT slug, visible, nav_override_href, nav_override_label FROM page_visibility")->fetchAll();
} catch (\Throwable $e) {
    // Tabelle existiert nicht → alles sichtbar
    json_success(array('visibility' => array(), 'navOverrides' => array()));
}

$visibility   = array();
$navOverrides = array();

// Slug → Nav-Href Mapping
$slug_nav = array(
    'studio'  => '/studio',
    'kurse'   => '/kurse',
    'preise'  => '/preise',
    'team'    => '/team',
    'kontakt' => '/kontakt',
);

foreach ($rows as $row) {
    $visibility[$row['slug']] = (int)$row['visible'] === 1;

    if (!empty($row['nav_override_href'])) {
        $navHref = isset($slug_nav[$row['slug']]) ? $slug_nav[$row['slug']] : '/' . $row['slug'];
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

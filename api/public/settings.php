<?php
/**
 * api/public/settings.php – Öffentliche Firmendaten
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/public/settings.php
 *
 * Gibt ausschließlich öffentlich sichtbare Felder zurück (kein Auth nötig).
 * Sensible Felder (SMTP-Zugangsdaten, Rechnungssuffixe etc.) werden NICHT
 * weitergegeben.
 *
 * Caching: Ergebnis wird 60 Sekunden lang in einer JSON-Datei im System-Temp-
 * Verzeichnis gecacht (z.B. /tmp/nac_pub_settings_<hash>.json). Dadurch spart
 * jeder Seitenaufruf einen DB-Query. Die Cache-Datei wird von
 * api/admin/settings.php nach einem PATCH automatisch gelöscht (Cache-Bust).
 *
 * Verwende diesen Endpunkt für Frontend-Seiten wie Impressum, AGB, Footer.
 */
declare(strict_types=1);
require_once '../config.php';

// Öffentlicher Endpunkt – kein Auth-Check

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

// ── Erlaubte öffentliche Keys (Whitelist) ─────────────────────────────────────
const PUBLIC_KEYS = [
    'studio_name',
    'company_name',
    'company_street',
    'company_zip',
    'company_city',
    'company_email',
    'company_court',
    'company_hrb',
    'ceo',
    'vat_id',
    'bank_iban',
    'bank_bic',
    'bank_name',
    'phone',
    'email',
    'website',
    'logo_url',
];

// ── Cache-Konfiguration ───────────────────────────────────────────────────────
// Cache-Datei pro Datenbank (damit Multi-Instanzen nicht kollidieren).
// sys_get_temp_dir() liefert auf Checkdomain /tmp – schreibbar für PHP.
$cacheFile = sys_get_temp_dir()
    . DIRECTORY_SEPARATOR
    . 'nac_pub_settings_' . md5(DB_NAME) . '.json';

const CACHE_TTL = 60; // Sekunden

/**
 * Gibt den Pfad der Cache-Datei zurück (für externe Nutzung durch admin/settings.php).
 * Kann mit pub_settings_cache_path() abgerufen werden, sofern diese Datei included wird.
 * Da das nicht der Fall ist, wird der Pfad über eine definierte Konstante geteilt.
 */
if (!defined('PUB_SETTINGS_CACHE_FILE')) {
    define('PUB_SETTINGS_CACHE_FILE', $cacheFile);
}

// ── Cache lesen ───────────────────────────────────────────────────────────────
if (
    file_exists($cacheFile)
    && (time() - filemtime($cacheFile)) < CACHE_TTL
) {
    $cached = file_get_contents($cacheFile);
    if ($cached !== false) {
        // Cache-Hit: direkt ausgeben (Header wurde schon durch config.php gesetzt)
        http_response_code(200);
        echo $cached;
        exit();
    }
}

// ── DB-Abfrage ────────────────────────────────────────────────────────────────
try {
    $db   = db();
    $stmt = $db->query(
        "SELECT `key`, `value` FROM settings WHERE `key` IN ('"
        . implode("','", PUBLIC_KEYS)
        . "')"
    );

    $raw = [];
    foreach ($stmt->fetchAll() as $row) {
        $raw[$row['key']] = $row['value'];
    }

    // Composed helpers (Abwärtskompatibilität mit alten Consumers)
    $street = $raw['company_street'] ?? '';
    $zip    = $raw['company_zip']    ?? '';
    $city   = $raw['company_city']   ?? '';
    $raw['company_address'] = trim($street . ', ' . trim($zip . ' ' . $city));

    $court = $raw['company_court'] ?? '';
    $hrb   = $raw['company_hrb']   ?? '';
    $raw['court_info'] = trim($court . ' ' . $hrb);

    // ── Cache schreiben ───────────────────────────────────────────────────────
    $json = json_encode($raw, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    // Atomares Schreiben: erst in Temp-Datei, dann umbenennen
    $tmp = $cacheFile . '.tmp.' . getmypid();
    if (@file_put_contents($tmp, $json) !== false) {
        @rename($tmp, $cacheFile);
    }

    json_success($raw);

} catch (\Exception $e) {
    json_error('Datenbankfehler: ' . $e->getMessage(), 500);
}

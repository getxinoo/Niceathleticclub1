<?php
/**
 * api/admin/settings.php – Globale System-Einstellungen
 * ─────────────────────────────────────────────────────────────────────────────
 * GET   /api/admin/settings.php  → Alle Settings als Key/Value-Map
 * PATCH /api/admin/settings.php  → Settings aktualisieren (beliebig viele Keys)
 * POST  /api/admin/settings.php  → Alias für PATCH
 *
 * Tabellen-Voraussetzung:
 *   settings   (key VARCHAR PK, value TEXT)
 *   audit_logs (user_id, action, entity_type, entity_id, details JSON)
 */
declare(strict_types=1);
require_once '../config.php';

$admin = require_auth();
if ($admin['role'] !== 'admin') json_error('Nicht autorisiert', 403);

$method = $_SERVER['REQUEST_METHOD'];
$db     = db();

// ── GET: Alle Settings laden ──────────────────────────────────────────────────
if ($method === 'GET') {
    try {
        $stmt     = $db->query("SELECT `key`, `value` FROM settings");
        $settings = [];
        foreach ($stmt->fetchAll() as $row) {
            $settings[$row['key']] = $row['value'];
        }
        json_success($settings);
    } catch (\Exception $e) {
        json_error('Datenbankfehler: ' . $e->getMessage(), 500);
    }
}

// ── PATCH / POST: Settings aktualisieren ─────────────────────────────────────
if ($method === 'PATCH' || $method === 'POST') {
    $body = get_body();

    if (empty($body) || !is_array($body)) {
        json_error('Leerer oder ungültiger Request-Body', 400);
    }

    try {
        $db->beginTransaction();

        $updatedKeys = [];
        $stmt = $db->prepare(
            "INSERT INTO settings (`key`, `value`) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)"
        );

        foreach ($body as $key => $value) {
            // Arrays/Objekte als JSON serialisieren, skalare Werte as-is
            $valStr = is_array($value) || is_object($value)
                ? json_encode($value, JSON_UNESCAPED_UNICODE)
                : (string) $value;

            $stmt->execute([$key, $valStr]);
            $updatedKeys[] = $key;
        }

        // Audit-Log: Welcher Admin hat welche Settings wann geändert?
        $db->prepare(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'UPDATE_SETTINGS', 'system', 'settings', ?)"
        )->execute([
            $admin['id'] ?? $admin['sub'] ?? 0,
            json_encode(['updated_keys' => $updatedKeys], JSON_UNESCAPED_UNICODE),
        ]);

        $db->commit();

        // ── Cache-Bust: Public-Settings-Cache löschen ─────────────────────────
        // Damit Footer, Impressum etc. beim nächsten Request sofort neue Daten
        // aus der DB erhalten, ohne auf den 60s-TTL warten zu müssen.
        $pubCacheFile = sys_get_temp_dir()
            . DIRECTORY_SEPARATOR
            . 'nac_pub_settings_' . md5(DB_NAME) . '.json';
        if (file_exists($pubCacheFile)) {
            @unlink($pubCacheFile);
        }

        json_success(['success' => true, 'updated_keys' => $updatedKeys]);

    } catch (\Exception $e) {
        $db->rollBack();
        json_error('Speichern fehlgeschlagen: ' . $e->getMessage(), 500);
    }
}

json_error('Method not allowed', 405);
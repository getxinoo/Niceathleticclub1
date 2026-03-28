<?php
/**
 * api/cron/gdpr-cleanup.php – DSGVO-Cron: IP-Löschung nach 90 Tagen
 * ─────────────────────────────────────────────────────────────────────────────
 * Aufgaben:
 *   1. IP-Adressen in audit_logs nach 90 Tagen auf NULL setzen (Art. 5 DSGVO)
 *   2. User-Agents nach 90 Tagen auf NULL setzen
 *   3. Session-IDs nach 90 Tagen auf NULL setzen
 *   4. (Optional) gdpr_pseudonymized=1 für gelöschte User setzen
 *
 * Aufruf (Checkdomain Cron, täglich 02:00):
 *   URL: https://nicefitness.de/api/cron/gdpr-cleanup.php?secret=nac_cron_2026_s3cur3_k3y
 *   Oder als CLI: php /path/to/gdpr-cleanup.php --secret=nac_cron_2026_s3cur3_k3y
 *
 * Checkdomain Cron-Einrichtung:
 *   → Hosting-Panel → Cronjobs → Neuer Cronjob
 *   Zeitplan: 0 2 * * * (täglich um 02:00 Uhr)
 *   Befehl:   curl -s "https://nicefitness.de/api/cron/gdpr-cleanup.php?secret=nac_cron_2026_s3cur3_k3y"
 *
 * DSGVO-Rechtsgrundlage:
 *   Art. 5 Abs. 1 lit. e DSGVO – Speicherbegrenzung
 *   Art. 17 DSGVO – Recht auf Löschung
 *   IP-Adressen sind personenbezogene Daten (EuGH C-582/14)
 */
declare(strict_types=1);

// Secret-Validierung (CLI und HTTP)
$secret = $_GET['secret'] ?? $_SERVER['argv'][1] ?? '';
if (strpos((string)$secret, '--secret=') === 0) {
    $secret = substr((string)$secret, 9);
}

require_once '../config.php';

if ($secret !== CRON_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
    exit();
}

$db      = db();
$results = [];
$cutoff  = date('Y-m-d H:i:s', strtotime('-90 days'));

// ── Timestamp-Spaltenname dynamisch ermitteln (identisch mit audit_logs.php) ──
$tsColumn = null;
foreach (['created_at', 'logged_at', 'log_time', 'ts', 'timestamp'] as $candidate) {
    try {
        $db->query("SELECT `{$candidate}` FROM `audit_logs` LIMIT 0");
        $tsColumn = $candidate;
        break;
    } catch (\Throwable $ignored) {}
}

// Wenn keine Timestamp-Spalte gefunden → GDPR-Cleanup kann nicht sicher gefiltert
// werden. Aufgabe 4 (Pseudonymisierung gelöschter User) läuft ohne Zeitfilter.
if (!$tsColumn) {
    $results['warning'] = 'Keine Timestamp-Spalte in audit_logs gefunden. '
        . 'Bitte Migration 006_audit_logs_created_at.sql ausführen. '
        . 'IP/UA/Session-Cleanup übersprungen.';
}

// ── 1. IP-Adressen nach 90 Tagen löschen ─────────────────────────────────────
if ($tsColumn) {
try {
    $stmt = $db->prepare("
        UPDATE audit_logs
        SET ip_address = NULL
        WHERE ip_address IS NOT NULL
          AND `{$tsColumn}` < ?
    ");
    $stmt->execute([$cutoff]);
    $results['ip_addresses_cleared'] = $stmt->rowCount();
} catch (\Throwable $e) {
    $results['ip_addresses_error'] = $e->getMessage();
}

// ── 2. User-Agents nach 90 Tagen löschen ─────────────────────────────────────
try {
    $stmt = $db->prepare("
        UPDATE audit_logs
        SET user_agent = NULL
        WHERE user_agent IS NOT NULL
          AND `{$tsColumn}` < ?
    ");
    $stmt->execute([$cutoff]);
    $results['user_agents_cleared'] = $stmt->rowCount();
} catch (\Throwable $e) {
    $results['user_agents_error'] = $e->getMessage();
}

// ── 3. Session-IDs nach 90 Tagen löschen ─────────────────────────────────────
try {
    $stmt = $db->prepare("
        UPDATE audit_logs
        SET session_id = NULL
        WHERE session_id IS NOT NULL
          AND `{$tsColumn}` < ?
    ");
    $stmt->execute([$cutoff]);
    $results['session_ids_cleared'] = $stmt->rowCount();
} catch (\Throwable $e) {
    $results['session_ids_error'] = $e->getMessage();
}
} // end if ($tsColumn)

// ── 4. Gelöschte User pseudonymisieren ───────────────────────────────────────
// Wenn ein user_id in audit_logs nicht mehr in users existiert → pseudonymisieren
try {
    $stmt = $db->prepare("
        UPDATE audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        SET al.gdpr_pseudonymized = 1,
            al.user_name = NULL
        WHERE al.user_id IS NOT NULL
          AND u.id IS NULL
          AND al.gdpr_pseudonymized = 0
    ");
    $stmt->execute();
    $results['orphan_logs_pseudonymized'] = $stmt->rowCount();
} catch (\Throwable $e) {
    $results['orphan_logs_error'] = $e->getMessage();
}

// ── 5. Alte Logs nach 2 Jahren komplett löschen (Art. 5 DSGVO) ───────────────
// Nur wenn Severity = 'info' (keine kritischen Logs löschen!)
$hardDelete = date('Y-m-d H:i:s', strtotime('-2 years'));
if ($tsColumn) {
try {
    $stmt = $db->prepare("
        DELETE FROM audit_logs
        WHERE severity = 'info'
          AND `{$tsColumn}` < ?
        LIMIT 1000
    ");
    $stmt->execute([$hardDelete]);
    $results['old_info_logs_deleted'] = $stmt->rowCount();
} catch (\Throwable $e) {
    $results['old_info_logs_error'] = $e->getMessage();
}
} // end if ($tsColumn)

// ── Cron-Lauf selbst im Audit-Log protokollieren ──────────────────────────
try {
    $db->prepare("
        INSERT INTO audit_logs
            (uuid, user_id, user_name, actor_type, actor_role, source,
             action, entity_type, entity_id, details, severity)
        VALUES ('system-cron', NULL, 'GDPR-Cleanup-Cron', 'cron', 'system', 'cron',
                'GDPR_CLEANUP', 'audit_logs', 'batch', ?, 'info')
    ")->execute([json_encode($results, JSON_UNESCAPED_UNICODE)]);
} catch (\Throwable $ignored) {}

// ── Antwort ───────────────────────────────────────────────────────────────────
http_response_code(200);
echo json_encode([
    'success'   => true,
    'timestamp' => date('Y-m-d H:i:s'),
    'cutoff_90_days' => $cutoff,
    'cutoff_2_years' => $hardDelete,
    'results'   => $results,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
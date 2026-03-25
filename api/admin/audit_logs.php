<?php
/**
 * api/admin/audit_logs.php – DSGVO-konformes System-Audit-Log
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  ?limit=100&offset=0
 *      &actor_type=admin|staff|member|cron|system|api
 *      &source=admin_ui|member_ui|cron|system|api
 *      &severity=info|warning|critical
 *      &entity_type=member|invoice|...
 *      &search=<string>         → sucht in uuid, user_name, action, entity_id
 *      &date_from=YYYY-MM-DD
 *      &date_to=YYYY-MM-DD
 *
 * DSGVO-Konformität (Art. 4, Art. 5 DSGVO):
 *   - Jede Identität trägt eine einmalige UUID (users.uuid / members.uuid).
 *   - Wenn gdpr_pseudonymized = 1: user_name wird NICHT zurückgegeben → null.
 *   - IP-Adressen werden nach 90 Tagen automatisch auf NULL gesetzt.
 *   - Der API-Caller bekommt IP-Adressen NUR maskiert zurück (erste 2 Oktette).
 */
declare(strict_types=1);
require_once '../config.php';

$admin = require_auth();

// Nur Rollen mit AUDIT_READ-Permission
$allowed_roles = ['admin', 'owner'];
if (!in_array($admin['role'] ?? '', $allowed_roles, true)) {
    json_error('Nicht autorisiert – AUDIT_READ erforderlich', 403);
}

$method = $_SERVER['REQUEST_METHOD'];
$db     = db();

// ── Nur GET ───────────────────────────────────────────────────────────────────
if ($method !== 'GET') {
    json_error('Methode nicht erlaubt', 405);
}

// ── Parameter ─────────────────────────────────────────────────────────────────
$limit       = min((int) ($_GET['limit']      ?? 200), 500);
$offset      = max((int) ($_GET['offset']     ?? 0),   0);
$actor_type  = trim($_GET['actor_type'] ?? '');
$source      = trim($_GET['source']     ?? '');
$severity    = trim($_GET['severity']   ?? '');
$entity_type = trim($_GET['entity_type'] ?? '');
$search      = trim($_GET['search']     ?? '');
$date_from   = trim($_GET['date_from']  ?? '');
$date_to     = trim($_GET['date_to']    ?? '');

// ── Whitelist-Validierung ─────────────────────────────────────────────────────
$valid_actor_types = ['', 'admin', 'staff', 'member', 'cron', 'system', 'api'];
$valid_sources     = ['', 'admin_ui', 'member_ui', 'cron', 'system', 'api'];
$valid_severities  = ['', 'info', 'warning', 'critical'];

if (!in_array($actor_type, $valid_actor_types, true)) $actor_type = '';
if (!in_array($source,     $valid_sources,     true)) $source     = '';
if (!in_array($severity,   $valid_severities,  true)) $severity   = '';

// ── Prüfen ob user_name-Spalte in audit_logs existiert ───────────────────────
// (Robustheit: läuft auch ohne Migration 005)
$hasUserName = false;
try {
    $db->query("SELECT `user_name` FROM `audit_logs` LIMIT 0");
    $hasUserName = true;
} catch (\Throwable $ignored) {
    $hasUserName = false;
}

// ── Prüfen ob gdpr_pseudonymized-Spalte existiert ────────────────────────────
$hasGdpr = false;
try {
    $db->query("SELECT `gdpr_pseudonymized` FROM `audit_logs` LIMIT 0");
    $hasGdpr = true;
} catch (\Throwable $ignored) {
    $hasGdpr = false;
}

// ── Timestamp-Spaltenname dynamisch ermitteln ─────────────────────────────────
// Mögliche Namen: created_at, logged_at, log_time, timestamp, ts
$tsColumn = null;
foreach (['created_at', 'logged_at', 'log_time', 'ts', 'timestamp'] as $candidate) {
    try {
        $db->query("SELECT `{$candidate}` FROM `audit_logs` LIMIT 0");
        $tsColumn = $candidate;
        break;
    } catch (\Throwable $ignored) {}
}
// Fallback: NULL – Query wird ohne Zeitstempel-Filter/-Sort ausgeführt
$tsExpr   = $tsColumn ? "al.`{$tsColumn}`" : 'NULL';
$orderBy  = $tsColumn ? "al.`{$tsColumn}` DESC" : 'al.id DESC';

// ── Query aufbauen ────────────────────────────────────────────────────────────
$where  = ['1=1'];
$params = [];

if ($actor_type !== '') {
    $where[]  = 'al.actor_type = ?';
    $params[] = $actor_type;
}
if ($source !== '') {
    $where[]  = 'al.source = ?';
    $params[] = $source;
}
if ($severity !== '') {
    $where[]  = 'al.severity = ?';
    $params[] = $severity;
}
if ($entity_type !== '') {
    $where[]  = 'al.entity_type LIKE ?';
    $params[] = '%' . $entity_type . '%';
}
if ($search !== '') {
    // user_name nur in Suche einbeziehen wenn Spalte existiert
    if ($hasUserName) {
        $where[]  = '(al.uuid LIKE ? OR al.user_name LIKE ? OR al.action LIKE ? OR al.entity_id LIKE ?)';
        $like     = '%' . $search . '%';
        $params   = array_merge($params, [$like, $like, $like, $like]);
    } else {
        $where[]  = '(al.uuid LIKE ? OR al.action LIKE ? OR al.entity_id LIKE ?)';
        $like     = '%' . $search . '%';
        $params   = array_merge($params, [$like, $like, $like]);
    }
}
if ($date_from !== '') {
    if ($tsColumn) {
        $where[]  = "al.`{$tsColumn}` >= ?";
        $params[] = $date_from . ' 00:00:00';
    }
}
if ($date_to !== '') {
    if ($tsColumn) {
        $where[]  = "al.`{$tsColumn}` <= ?";
        $params[] = $date_to . ' 23:59:59';
    }
}

$whereSQL = implode(' AND ', $where);

// ── Gesamt-Count ──────────────────────────────────────────────────────────────
try {
    $countStmt = $db->prepare("SELECT COUNT(*) FROM audit_logs al WHERE $whereSQL");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();
} catch (\Exception $e) {
    json_error('Datenbankfehler (count): ' . $e->getMessage(), 500);
}

// ── SELECT-Felder dynamisch je nach vorhandenen Spalten ───────────────────────
$selectUserName = $hasUserName
    ? ($hasGdpr
        ? 'CASE WHEN al.gdpr_pseudonymized = 1 THEN NULL ELSE al.user_name END AS user_name'
        : 'al.user_name')
    : "NULL AS user_name";

$selectGdpr = $hasGdpr
    ? 'al.gdpr_pseudonymized'
    : '0 AS gdpr_pseudonymized';

// ── Haupt-Query ───────────────────────────────────────────────────────────────
try {
    $sql = "
        SELECT
            al.id,
            al.uuid,
            al.user_id,
            -- DSGVO: user_name NUR ausgeben wenn NICHT pseudonymisiert
            $selectUserName,
            $selectGdpr,
            al.actor_type,
            al.actor_role,
            al.source,
            al.action,
            al.entity_type,
            al.entity_id,
            al.details,
            al.severity,
            -- DSGVO: IP nur die ersten 2 Oktette (IPv4)
            CASE
                WHEN al.ip_address IS NULL THEN NULL
                WHEN al.ip_address LIKE '%.%.%.%'
                    THEN CONCAT(
                        SUBSTRING_INDEX(al.ip_address, '.', 2),
                        '.*.*'
                    )
                ELSE '****'
            END AS ip_address,
            al.user_agent,
            al.session_id,
            {$tsExpr} AS timestamp
        FROM audit_logs al
        WHERE $whereSQL
        ORDER BY {$orderBy}
        LIMIT ? OFFSET ?
    ";

    $queryParams = array_merge($params, [$limit, $offset]);
    $stmt = $db->prepare($sql);
    $stmt->execute($queryParams);
    $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

    $formatted = array_map(function (array $row): array {
        return [
            'id'                  => (string) $row['id'],
            'uuid'                => $row['uuid'],
            'user_id'             => $row['user_id'] !== null ? (string) $row['user_id'] : null,
            'user_name'           => $row['user_name'] ?? null,
            'gdpr_pseudonymized'  => (bool) ($row['gdpr_pseudonymized'] ?? false),
            'actor_type'          => $row['actor_type'],
            'actor_role'          => $row['actor_role'] ?? null,
            'source'              => $row['source'] ?? null,
            'action'              => $row['action'],
            'entity_type'         => $row['entity_type'],
            'entity_id'           => $row['entity_id'],
            'details'             => !empty($row['details']) ? json_decode($row['details'], true) : null,
            'severity'            => $row['severity'],
            'ip_address'          => $row['ip_address'] ?? null,
            'user_agent'          => $row['user_agent'] ?? null,
            'session_id'          => $row['session_id'] ?? null,
            'timestamp'           => $row['timestamp'],
        ];
    }, $rows);

    json_success([
        'data'          => $formatted,
        'total'         => $total,
        'limit'         => $limit,
        'offset'        => $offset,
        '_schema_warn'  => !$hasUserName
            ? 'Spalte user_name fehlt – bitte Migration 005_audit_logs_user_name.sql ausführen.'
            : (!$tsColumn
                ? 'Kein Timestamp-Spaltenname gefunden (created_at / logged_at / log_time / ts). Zeitfilter und Sortierung deaktiviert.'
                : null),
    ]);

} catch (\Exception $e) {
    json_error('Datenbankfehler: ' . $e->getMessage(), 500);
}
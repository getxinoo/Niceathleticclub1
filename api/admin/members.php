<?php
/**
 * api/admin/members.php
 * NAC EMS Backend – Mitgliederverwaltung (inkl. CRM-Neuanlage)
 *
 * Audit-Logging: Nutzt den zentralen audit_log() Helper aus config.php.
 * Alle Schreiboperationen erzeugen automatisch UUID, IP, User-Agent, Session-ID.
 */
declare(strict_types=1);
require_once '../config.php';

$admin  = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$db     = db();

// ── Helper: Spalten der members-Tabelle laden (SHOW COLUMNS, kein INFORMATION_SCHEMA) ──
function get_member_columns(PDO $db): array
{
    $stmt = $db->query("SHOW COLUMNS FROM members");
    $cols = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $cols[] = $row['Field'];
    }
    return $cols;
}

// ── Helper: Prüft ob eine Spalte in einer Tabelle existiert (ohne INFORMATION_SCHEMA) ──
function db_column_exists(string $table, string $column): bool
{
    try {
        $db   = db();
        $stmt = $db->query("SHOW COLUMNS FROM `{$table}`");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if ($row['Field'] === $column) return true;
        }
        return false;
    } catch (\Throwable $e) {
        return false;
    }
}

// ── GET ───────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($id) {
        $stmt = $db->prepare("SELECT * FROM members WHERE id = ?");
        $stmt->execute([$id]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$member) json_error('Mitglied nicht gefunden.', 404);
        json_success($member);
    }

    // Frontend erwartet ein pures Array (kein Objekt)
    $stmt = $db->query("SELECT * FROM members ORDER BY created_at DESC");
    json_success($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// ── POST: create / status / block / unblock ───────────────────────────────────
if ($method === 'POST') {
    $body = get_body();

    // ── 1. MANUELLE NEUANLAGE EINES MITGLIEDS (CRM) ──────────────────────────
    if ($action === 'create') {
        $required = ['first_name', 'last_name', 'email'];
        foreach ($required as $f) {
            if (empty($body[$f])) json_error("Pflichtfeld fehlt: $f", 400);
        }

        $check = $db->prepare("SELECT id FROM members WHERE email = ?");
        $check->execute([trim($body['email'])]);
        if ($check->fetchColumn()) {
            json_error('Diese E-Mail Adresse wird bereits verwendet.', 400);
        }

        $cols = get_member_columns($db);

        $insert_fields = ['first_name', 'last_name', 'email', 'phone', 'plan', 'status', 'active', 'member_since', 'location_id', 'check_in_code'];
        $insert_values = [
            trim($body['first_name']),
            trim($body['last_name']),
            trim($body['email']),
            $body['phone'] ?? null,
            $body['plan'] ?? 'starter',
            $body['status'] ?? 'active',
            ($body['status'] ?? 'active') === 'active' ? 1 : 0,
            $body['member_since'] ?? date('Y-m-d'),
            1,
            'NAC' . strtoupper(substr(md5(uniqid()), 0, 6)),
        ];

        $optional_fields = [
            'date_of_birth' => $body['date_of_birth'] ?? $body['birth_date'] ?? null,
            'gender'        => $body['gender'] ?? null,
            'street'        => $body['street'] ?? null,
            'house_number'  => $body['house_number'] ?? null,
            'zip_code'      => $body['zip'] ?? $body['zip_code'] ?? null,
            'city'          => $body['city'] ?? null,
            'country'       => $body['country'] ?? null,
            'notes'         => $body['notes'] ?? null,
        ];

        foreach ($optional_fields as $col => $val) {
            if (in_array($col, $cols, true) && $val !== null) {
                $insert_fields[] = $col;
                $insert_values[] = $val;
            }
        }

        $placeholders = implode(', ', array_fill(0, count($insert_fields), '?'));
        $fields_str   = implode(', ', $insert_fields);

        $db->prepare("INSERT INTO members ($fields_str) VALUES ($placeholders)")->execute($insert_values);
        $new_id = (int)$db->lastInsertId();

        if (in_array('nac_member_id', $cols, true)) {
            $nac_id_str = 'NAC-' . (10000 + $new_id);
            $db->prepare("UPDATE members SET nac_member_id = ? WHERE id = ?")->execute([$nac_id_str, $new_id]);
        }

        if (db_column_exists('contracts', 'member_id')) {
            $db->prepare("INSERT INTO contracts (member_id, type_id, start_date, status) VALUES (?, 1, ?, 'active')")
               ->execute([$new_id, $body['contract_start_date'] ?? date('Y-m-d')]);
        }

        if (!empty($body['create_account']) && !empty($body['password'])) {
            $hash = password_hash($body['password'], PASSWORD_DEFAULT);
            $db->prepare("INSERT INTO users (member_id, role, first_name, last_name, email, password_hash) VALUES (?, 'member', ?, ?, ?, ?)")
               ->execute([$new_id, trim($body['first_name']), trim($body['last_name']), trim($body['email']), $hash]);
        }

        audit_log($admin, 'CREATE_MEMBER', 'member', $new_id, [
            'email' => $body['email'],
            'plan'  => $body['plan'] ?? 'starter',
        ]);
        json_success(['success' => true, 'id' => $new_id, 'message' => 'Mitglied erfolgreich angelegt.']);
    }

    // ── 2. STATUS / BLOCK / UNBLOCK ──────────────────────────────────────────
    if (in_array($action, ['status', 'block', 'unblock'], true)) {
        $id = (int)($_GET['id'] ?? $body['id'] ?? 0);
        if (!$id) json_error('Mitglieds-ID fehlt.', 400);

        $status     = 'active';
        $is_blocked = 0;

        if ($action === 'block' || ($action === 'status' && ($body['status'] ?? '') === 'blocked')) {
            $status     = 'blocked';
            $is_blocked = 1;
        }

        $db_cols = get_member_columns($db);
        if (in_array('is_blocked', $db_cols, true)) {
            $db->prepare("UPDATE members SET status = ?, active = ?, is_blocked = ? WHERE id = ?")
               ->execute([$status, ($status === 'active' ? 1 : 0), $is_blocked, $id]);
        } else {
            $db->prepare("UPDATE members SET status = ?, active = ? WHERE id = ?")
               ->execute([$status, ($status === 'active' ? 1 : 0), $id]);
        }

        audit_log($admin, $is_blocked ? 'BLOCK_MEMBER' : 'UNBLOCK_MEMBER', 'member', $id, [], $is_blocked ? 'warning' : 'info');
        json_success(['success' => true]);
    }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
if ($method === 'PATCH') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_error('Mitglieds-ID fehlt.', 400);

    $body = get_body();
    if (empty($body)) json_error('Keine Daten zum Aktualisieren.', 400);

    $db_cols = get_member_columns($db);
    $updates = [];
    $values  = [];

    $allowed = [
        'first_name', 'last_name', 'email', 'phone', 'plan', 'status', 'active',
        'member_since', 'date_of_birth', 'gender', 'street', 'house_number',
        'zip_code', 'city', 'country', 'notes', 'is_blocked', 'block_message',
    ];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body) && in_array($field, $db_cols, true)) {
            $updates[] = "$field = ?";
            $values[]  = $body[$field];
        }
    }

    if (empty($updates)) json_error('Keine gültigen Felder übergeben.', 400);

    $values[] = $id;
    $db->prepare("UPDATE members SET " . implode(', ', $updates) . " WHERE id = ?")->execute($values);

    audit_log($admin, 'UPDATE_MEMBER', 'member', $id, ['updated_fields' => array_keys($body)]);
    json_success(['success' => true]);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_error('Mitglieds-ID fehlt.', 400);

    $check = $db->prepare("SELECT magicline_id FROM members WHERE id = ?");
    $check->execute([$id]);
    $ml_id = $check->fetchColumn();

    if ($ml_id) {
        json_error('Mitglieder aus Magicline können nicht gelöscht werden. Bitte in Magicline stornieren oder Account auf "Inaktiv" setzen.', 403);
    }

    $db->prepare("DELETE FROM members WHERE id = ?")->execute([$id]);
    audit_log($admin, 'DELETE_MEMBER', 'member', $id, [], 'warning');
    json_success(['success' => true]);
}

json_error('Ungültige Anfrage.', 400);

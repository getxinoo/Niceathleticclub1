<?php
/**
 * me.php – Aktuellen User mit Rolle + effective_permissions laden
 * ─────────────────────────────────────────────────────────────────────────────
 * GET → User-Profil mit Permissions
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Methode nicht erlaubt.', 405);
}

$payload = require_auth();
$userId  = (int)($payload['sub'] ?? 0);

if ($userId < 1) {
    json_error('Ungültige User-ID im Token.', 401);
}

// User aus DB laden
$stmt = db()->prepare(
    "SELECT id, name, email, company_email, role, member_id, active,
            must_change_pw, pw_changed_at, last_login, created_at
     FROM users WHERE id = ? LIMIT 1"
);
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    json_error('User nicht gefunden.', 404);
}

// Effective Permissions laden
$permissions = [];
try {
    $permissions = get_effective_permissions($user['role'], (int)$user['id']);
} catch (\Exception $e) {
    // Permissions-Tabellen existieren noch nicht
}

json_success([
    'id'              => (string)$user['id'],
    'name'            => $user['name'],
    'email'           => $user['email'],
    'company_email'   => $user['company_email'],
    'role'            => $user['role'],
    'member_id'       => $user['member_id'] ? (int)$user['member_id'] : null,
    'active'          => (bool)$user['active'],
    'must_change_pw'  => (bool)$user['must_change_pw'],
    'pw_changed_at'   => $user['pw_changed_at'],
    'last_login'      => $user['last_login'],
    'created_at'      => $user['created_at'],
    'permissions'     => $permissions,
]);

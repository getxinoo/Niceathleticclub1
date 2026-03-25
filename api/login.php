<?php
/**
 * login.php – Authentifizierungs-Endpunkt
 */
declare(strict_types=1);
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Methode nicht erlaubt.', 405);
}

$body = get_body();

// ── Input-Validierung ─────────────────────────────────────────────────────────
$email    = strtolower(trim((string) ($body['email']    ?? '')));
$password = (string) ($body['password'] ?? '');

if (empty($email) || empty($password)) {
    json_error('E-Mail und Passwort sind erforderlich.', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Ungültige E-Mail-Adresse.', 422);
}

// Passwort-Länge begrenzen (DoS-Schutz gegen bcrypt-Timing)
if (strlen($password) > 72) {
    json_error('Ungültige Zugangsdaten.', 401);
}

// ── Datenbanksuche ────────────────────────────────────────────────────────────
$user = null;

try {
    // Prüfen ob users-Tabelle existiert und Einträge hat
    $count_stmt = db()->query("SELECT COUNT(*) FROM users");
    $user_count = (int) $count_stmt->fetchColumn();

    // Prüfe ob must_change_pw Spalte existiert (für Abwärtskompatibilität)
    $has_pw_flag = false;
    try {
        db()->query("SELECT must_change_pw FROM users LIMIT 0");
        $has_pw_flag = true;
    } catch (\PDOException $e) {
        // Spalte existiert noch nicht
    }

    if ($user_count === 0) {
        // ── Tabelle leer → Master-Admin Bootstrap ─────────────────────────────
        if ($email === strtolower(MASTER_ADMIN_EMAIL) && $password === MASTER_ADMIN_PASS) {
            // Ersten Admin-User in der DB anlegen
            $hash = password_hash(MASTER_ADMIN_PASS, PASSWORD_BCRYPT, ['cost' => 12]);
            $stmt = db()->prepare(
                "INSERT INTO users (name, email, password_hash, role, active, created_at)
                 VALUES ('NAC Administrator', ?, ?, 'admin', 1, NOW())"
            );
            $stmt->execute([MASTER_ADMIN_EMAIL, $hash]);
            $new_id = (int) db()->lastInsertId();

            $user = [
                'id'        => $new_id,
                'name'      => 'NAC Administrator',
                'email'     => MASTER_ADMIN_EMAIL,
                'role'      => 'admin',
                'member_id' => null,
            ];
        } else {
            password_verify('dummy', '$2y$12$invaliddummyhashfortimingequalisation');
            json_error('Ungültige Zugangsdaten.', 401);
        }
    } else {
        // ── Normaler Login aus DB ─────────────────────────────────────────────
        $cols = "id, name, email, password_hash, role, member_id, active";
        if ($has_pw_flag) {
            $cols .= ", must_change_pw, company_email";
        }
        $stmt = db()->prepare(
            "SELECT $cols
             FROM users
             WHERE email = ? OR company_email = ?
             LIMIT 1"
        );
        $stmt->execute([$email, $email]);
        $row = $stmt->fetch();

        if (!$row) {
            // ── Kein User gefunden → Master-Admin Fallback prüfen ─────────────
            if ($email === strtolower(MASTER_ADMIN_EMAIL) && $password === MASTER_ADMIN_PASS) {
                // Master-Admin existiert nicht in DB → anlegen
                $hash = password_hash(MASTER_ADMIN_PASS, PASSWORD_BCRYPT, ['cost' => 12]);
                $ins = db()->prepare(
                    "INSERT INTO users (name, email, password_hash, role, active, created_at)
                     VALUES ('NAC Administrator', ?, ?, 'admin', 1, NOW())"
                );
                $ins->execute([strtolower(MASTER_ADMIN_EMAIL), $hash]);
                $new_id = (int) db()->lastInsertId();

                $user = [
                    'id'        => $new_id,
                    'name'      => 'NAC Administrator',
                    'email'     => strtolower(MASTER_ADMIN_EMAIL),
                    'role'      => 'admin',
                    'member_id' => null,
                ];
            } else {
                password_verify('dummy', '$2y$12$invaliddummyhashfortimingattackprevention');
                json_error('Ungültige Zugangsdaten.', 401);
            }
        } else {
            // User gefunden → Passwort prüfen
            if (!$row['active']) {
                json_error('Dein Account ist deaktiviert. Bitte kontaktiere den Support.', 403);
            }

            if (!password_verify($password, $row['password_hash'])) {
                // ── Passwort falsch → Master-Admin Fallback für DIESEN User? ──
                // Nur wenn E-Mail = Master-Admin-E-Mail und Passwort = Master-Pass
                // → Hash in DB reparieren (Self-Healing)
                if ($email === strtolower(MASTER_ADMIN_EMAIL) && $password === MASTER_ADMIN_PASS) {
                    $new_hash = password_hash(MASTER_ADMIN_PASS, PASSWORD_BCRYPT, ['cost' => 12]);
                    db()->prepare("UPDATE users SET password_hash = ?, active = 1 WHERE id = ?")
                        ->execute([$new_hash, $row['id']]);

                    $user = [
                        'id'             => (int) $row['id'],
                        'name'           => $row['name'],
                        'email'          => $row['email'],
                        'role'           => $row['role'],
                        'member_id'      => $row['member_id'] ? (int)$row['member_id'] : null,
                        'must_change_pw' => false,
                        'company_email'  => null,
                    ];
                } else {
                    json_error('Ungültige Zugangsdaten.', 401);
                }
            } else {
                // Passwort korrekt!
                // Rehash wenn bcrypt-Cost veraltet ist
                if (password_needs_rehash($row['password_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
                    $new_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                    db()->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
                        ->execute([$new_hash, $row['id']]);
                }

                $user = [
                    'id'             => (int) $row['id'],
                    'name'           => $row['name'],
                    'email'          => $row['email'],
                    'role'           => $row['role'],
                    'member_id'      => $row['member_id'] ? (int)$row['member_id'] : null,
                    'must_change_pw' => (bool) ($row['must_change_pw'] ?? false),
                    'company_email'  => $row['company_email'] ?? null,
                ];
            }
        }
    }
} catch (\PDOException $e) {
    // Tabelle existiert noch nicht → Nur Master-Admin erlauben
    if ($email === strtolower(MASTER_ADMIN_EMAIL) && $password === MASTER_ADMIN_PASS) {
        $user = [
            'id'        => 0,
            'name'      => 'NAC Administrator',
            'email'     => MASTER_ADMIN_EMAIL,
            'role'      => 'admin',
            'member_id' => null,
        ];
    } else {
        json_error('Anmeldung derzeit nicht möglich. Bitte setup_db.sql ausführen.', 503);
    }
}

// ── Token erstellen ───────────────────────────────────────────────────────────
$now    = time();

// Effective Permissions laden (P0: RBAC im Token)
$effective_permissions = [];
try {
    if (function_exists('get_effective_permissions') && ($user['id'] ?? 0) > 0) {
        $effective_permissions = get_effective_permissions(
            $user['role'],
            (int)$user['id']
        );
    }
} catch (\Exception $e) {
    // Tabelle existiert noch nicht → leeres Array (Admin hat Frontend-Fallback)
}

$token  = create_token([
    'sub'         => $user['id'],
    'name'        => $user['name'],
    'email'       => $user['email'],
    'role'        => $user['role'],
    'member_id'   => $user['member_id'] ?? null,
    'permissions' => $effective_permissions,
    'iat'         => $now,
    'exp'         => $now + TOKEN_EXPIRY,
]);

// ── Last Login aktualisieren + Audit-Log ──────────────────────────────────────
if (($user['id'] ?? 0) > 0) {
    try {
        db()->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")
            ->execute([$user['id']]);

        // Audit: Login-Event
        db()->prepare(
            "INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details)
             VALUES (?, ?, 'login', 'auth', ?, ?)"
        )->execute([
            $user['id'],
            $user['name'],
            (string)$user['id'],
            json_encode([
                'ip'   => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'role' => $user['role'],
                'ua'   => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
            ]),
        ]);
    } catch (\PDOException $e) {
        // Nicht kritisch – ignorieren
    }
}

// ── Erfolgreiche Antwort ──────────────────────────────────────────────────────
json_success([
    'token' => $token,
    'user'  => [
        'id'             => (string) $user['id'],
        'name'           => $user['name'],
        'email'          => $user['email'],
        'role'           => $user['role'],
        'is_blocked'     => false,
        'member_id'      => $user['member_id'] ?? null,
        'must_change_pw' => (bool) ($user['must_change_pw'] ?? false),
        'company_email'  => $user['company_email'] ?? null,
        'permissions'    => $effective_permissions,
    ],
]);
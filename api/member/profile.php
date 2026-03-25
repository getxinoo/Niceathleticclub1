<?php
/**
 * api/member/profile.php – Mitglieds-Profil
 * ─────────────────────────────────────────────────────────────────────────────
 * GET   /api/member/profile.php   → Profil laden
 * PATCH /api/member/profile.php   → Profil aktualisieren (phone, avatarUrl, password)
 *
 * Auth: JWT Bearer Token erforderlich.
 *       Das Token-Payload enthält 'sub' (user_id) und 'member_id'.
 */
declare(strict_types=1);
require_once '../config.php';

// ── Auth ──────────────────────────────────────────────────────────────────────
$user     = require_auth();

// member_id aus Token lesen; Fallback auf sub (user_id) für Abwärtskompatibilität
$memberId = $user['member_id'] ?? $user['sub'] ?? 1;

$method = $_SERVER['REQUEST_METHOD'];

if (!in_array($method, ['GET', 'PATCH'], true)) {
    json_error('Methode nicht erlaubt.', 405);
}

// ── Helper: Profil aus DB laden & als JSON senden ────────────────────────────
/**
 * Liest das Mitglieds-Profil aus der DB und sendet es als JSON-Response.
 * Fällt auf Stub-Daten zurück wenn der Datensatz nicht gefunden wurde
 * (nützlich während der Entwicklung).
 *
 * @param array<string,mixed> $user      Verifiziertes JWT-Payload
 * @param int|string          $memberId  ID des Mitglieds
 */
function get_profile(array $user, int|string $memberId): void
{
    try {
        $stmt = db()->prepare(
            'SELECT id, first_name, last_name, email, phone,
                    plan, member_since, avatar_url, check_in_code
             FROM members WHERE id = ? AND active = 1'
        );
        $stmt->execute([$memberId]);
        $m = $stmt->fetch();
    } catch (\Exception $e) {
        $m = false;
    }

    // Stub-Antwort für Entwicklung / leere DB
    if (!$m) {
        json_success([
            'id'          => '1',
            'firstName'   => 'Alex',
            'lastName'    => 'Richter',
            'email'       => 'alex.richter@example.com',
            'phone'       => '+49 176 123 456 78',
            'plan'        => 'performance',
            'memberSince' => '2025-09-01',
            'avatarUrl'   => null,
            'checkInCode' => 'NAC-2025-AR-8847',
        ]);
    }

    json_success([
        'id'          => (string) $m['id'],
        'firstName'   => $m['first_name'],
        'lastName'    => $m['last_name'],
        'email'       => $m['email'],
        'phone'       => $m['phone'],
        'plan'        => $m['plan'],
        'memberSince' => $m['member_since'],
        'avatarUrl'   => $m['avatar_url'],
        'checkInCode' => $m['check_in_code'],
    ]);
}

// ── Routing ───────────────────────────────────────────────────────────────────
switch ($method) {

    case 'GET':
        get_profile($user, $memberId);
        break; // json_success() in get_profile() ruft exit() auf – nur zur Klarheit

    case 'PATCH':
        $body = get_body();
        $db   = db();

        $updates = [];
        $params  = [];

        // 1. Profil-Daten (phone / avatarUrl → avatar_url in der DB)
        if (isset($body['phone'])) {
            $updates[] = 'phone = ?';
            $params[]  = trim($body['phone']);
        }
        if (isset($body['avatarUrl'])) {
            $updates[] = 'avatar_url = ?';
            $params[]  = trim($body['avatarUrl']);
        }

        if (!empty($updates)) {
            $sql      = 'UPDATE members SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $params[] = $memberId;
            $db->prepare($sql)->execute($params);
        }

        // 2. Passwort ändern (betrifft die `users`-Tabelle, nicht `members`!)
        //    Mindestlänge 8 Zeichen wird serverseitig erneut geprüft.
        if (isset($body['password']) && strlen((string) $body['password']) >= 8) {
            $hash = password_hash((string) $body['password'], PASSWORD_BCRYPT);
            $db->prepare('UPDATE users SET password_hash = ? WHERE member_id = ?')
               ->execute([$hash, $memberId]);

            // Optional: Token-Invalidierung nach Passwortänderung hier implementieren
            // z. B. token_version in users erhöhen und beim Login/verify_token prüfen.
        }

        // Aktualisiertes Profil zurücksenden
        get_profile($user, $memberId);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

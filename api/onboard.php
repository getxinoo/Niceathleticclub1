<?php
/**
 * api/onboard.php – Smart-Transition: Bewerber → Mitarbeiter
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/onboard.php
 *   Body: { applicant_id, role, permissions[], mode: "auto"|"manual" }
 *
 * Ablauf bei mode="auto":
 *   1. Bewerber-Daten laden
 *   2. Firmen-E-Mail generieren (vorname.nachname@nice-fitness.de)
 *   3. Kryptografisches Zufalls-Passwort erzeugen (16 Zeichen)
 *   4. Neuen User in `users` anlegen (must_change_pw = 1)
 *   5. Mitarbeiter-Nummer (EMP-XXX) vergeben
 *   6. Bewerber-Status auf "eingestellt" setzen
 *   7. (Optional) Willkommens-Mail via SMTP/SendGrid
 *
 * Ablauf bei mode="manual":
 *   1. Nur Bewerber-Status auf "eingestellt" setzen
 *   2. Kein User-Account wird erstellt
 *
 * POST /api/onboard.php?action=change_password
 *   Body: { new_password }
 *   → Validiert Passwort-Policy, setzt must_change_pw = 0
 *
 * POST /api/onboard.php?action=check_email
 *   Body: { first_name, last_name }
 *   → Gibt die generierte + verfuegbare E-Mail zurueck
 */
declare(strict_types=1);
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$db     = db();

// Alle Onboarding-Aktionen sind POST-only (Diagnostics erwartet GET → 405)
if ($method !== 'POST') {
    json_error('Methode nicht erlaubt. Nur POST.', 405);
}

// ── Helper: Firmen-E-Mail generieren ─────────────────────────────────────────
function generate_company_email(string $first, string $last): string
{
    // Umlaute + Sonderzeichen normalisieren
    $map = [
        'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss',
        'Ä' => 'ae', 'Ö' => 'oe', 'Ü' => 'ue',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'á' => 'a', 'à' => 'a',
    ];
    $first = strtr(strtolower(trim($first)), $map);
    $last  = strtr(strtolower(trim($last)), $map);

    // Nur a-z behalten
    $first = preg_replace('/[^a-z]/', '', $first);
    $last  = preg_replace('/[^a-z]/', '', $last);

    return $first . '.' . $last . '@nice-fitness.de';
}

// ── Helper: Eindeutige E-Mail (Duplikat-Check) ──────────────────────────────
function get_unique_company_email(string $first, string $last): string
{
    global $db;
    $base = generate_company_email($first, $last);
    $email = $base;
    $counter = 1;

    while (true) {
        $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE company_email = ? OR email = ?");
        $stmt->execute([$email, $email]);
        if ((int) $stmt->fetchColumn() === 0) break;

        $counter++;
        // vorname.nachname2@nice-fitness.de
        $email = str_replace('@nice-fitness.de', $counter . '@nice-fitness.de', $base);
    }

    return $email;
}

// ── Helper: Kryptografisches Zufalls-Passwort ────────────────────────────────
function generate_secure_password(int $length = 16): string
{
    $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    $pw = '';
    $max = strlen($chars) - 1;
    for ($i = 0; $i < $length; $i++) {
        $pw .= $chars[random_int(0, $max)];
    }
    return $pw;
}

// ── Helper: Naechste Mitarbeiter-Nummer ──────────────────────────────────────
function next_staff_number(): string
{
    global $db;
    $stmt = $db->query("SELECT COUNT(*) FROM users WHERE staff_number IS NOT NULL AND staff_number != ''");
    $count = (int) $stmt->fetchColumn() + 1;
    return sprintf('EMP-%03d', $count);
}

// ── Helper: Passwort-Policy validieren ───────────────────────────────────────
function validate_password(string $pw, string $firstName = '', string $lastName = '', string $birthDate = ''): array
{
    $errors = [];

    if (strlen($pw) < 10) {
        $errors[] = 'Mindestens 10 Zeichen erforderlich.';
    }
    if (!preg_match('/[A-Z]/', $pw)) {
        $errors[] = 'Mindestens ein Grossbuchstabe erforderlich.';
    }
    if (!preg_match('/[a-z]/', $pw)) {
        $errors[] = 'Mindestens ein Kleinbuchstabe erforderlich.';
    }
    if (!preg_match('/\d/', $pw)) {
        $errors[] = 'Mindestens eine Zahl erforderlich.';
    }
    if (!preg_match('/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/', $pw)) {
        $errors[] = 'Mindestens ein Sonderzeichen erforderlich.';
    }

    // Anti-Social-Engineering: Keine Namensbestandteile
    $forbidden = array_filter(array_map('strtolower', [$firstName, $lastName]));

    // Geburtstag-Teile (Jahr, Monat, Tag)
    if ($birthDate) {
        $parts = preg_split('/[-\/.]/', $birthDate);
        foreach ($parts as $p) {
            if (strlen($p) >= 2) $forbidden[] = $p;
        }
    }

    $pwLower = strtolower($pw);
    foreach ($forbidden as $f) {
        if ($f && strlen($f) >= 3 && strpos($pwLower, $f) !== false) {
            $errors[] = 'Passwort darf keine Namensbestandteile oder Geburtsdaten enthalten.';
            break;
        }
    }

    return $errors;
}

// ── Helper: Audit-Log ────────────────────────────────────────────────────────
function log_audit_onboard(string $action_name, string $entity_id, array $details = []): void
{
    global $db;
    try {
        $user = require_auth();
        $db->prepare(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, 'onboarding', ?, ?)"
        )->execute([
            $user['sub'] ?? $user['id'] ?? 0,
            $action_name,
            $entity_id,
            json_encode($details, JSON_UNESCAPED_UNICODE),
        ]);
    } catch (\Throwable $e) {
        // Audit-Log ist nicht kritisch – wenn die Tabelle fehlt, ignorieren
        error_log("Audit log failed: " . $e->getMessage());
    }
}


// =============================================================================
// POST ?action=check_email – Verfuegbare Firmen-E-Mail pruefen
// =============================================================================
if ($method === 'POST' && $action === 'check_email') {
    // Teil des Staff-Anlage-Flows: ohne team.manage keine E-Mail-Enumeration
    // (Admin hat implizit alle Rechte, HR hat team.manage per Default-Rolle).
    require_permission('team.manage');

    $body = get_body();
    $first = trim($body['first_name'] ?? '');
    $last  = trim($body['last_name'] ?? '');

    if (empty($first) || empty($last)) {
        json_error('first_name und last_name sind Pflichtfelder.', 400);
    }

    $email = get_unique_company_email($first, $last);
    json_success(['company_email' => $email]);
}


// =============================================================================
// POST – Onboarding ausfuehren
// =============================================================================
if ($method === 'POST' && !$action) {
    // Staff-/Account-Anlage: Permission statt hartkodierter Rollenliste.
    // team.manage = "Mitarbeiter anlegen und deaktivieren" (RBAC-Framework):
    // Admin passiert immer, HR per Default-Rolle, User-Overrides (grant/revoke)
    // aus user_permissions werden respektiert. Member erhalten 403.
    $admin = require_permission('team.manage');

    $body = get_body();
    $applicantId = (int) ($body['applicant_id'] ?? 0);
    $role        = $body['role'] ?? '';
    $permissions = $body['permissions'] ?? [];
    $mode        = $body['mode'] ?? 'auto';  // 'auto' oder 'manual'

    if (!$applicantId) {
        json_error('applicant_id ist ein Pflichtfeld.', 400);
    }

    // Bewerber laden
    $stmt = $db->prepare("SELECT * FROM career_applicants WHERE id = ?");
    $stmt->execute([$applicantId]);
    $applicant = $stmt->fetch();

    if (!$applicant) {
        json_error('Bewerber nicht gefunden.', 404);
    }

    // ── MODE: MANUAL → Nur Status aendern ────────────────────────────────────
    if ($mode === 'manual') {
        $db->prepare(
            "UPDATE career_applicants
             SET status = 'eingestellt', onboard_mode = 'manual', onboarded_at = NOW()
             WHERE id = ?"
        )->execute([$applicantId]);

        log_audit_onboard('ONBOARD_MANUAL', (string) $applicantId, [
            'applicant_name' => $applicant['first_name'] . ' ' . $applicant['last_name'],
        ]);

        json_success([
            'success' => true,
            'mode'    => 'manual',
            'message' => 'Bewerber-Status auf eingestellt gesetzt. Account muss manuell angelegt werden.',
        ]);
    }

    // ── MODE: AUTO → Vollautomatisches Onboarding ────────────────────────────
    $allowedRoles = ['admin', 'hr', 'finance', 'trainer', 'frontdesk'];
    if (!in_array($role, $allowedRoles)) {
        json_error('Ungueltige Rolle: ' . $role, 400);
    }

    try {
        $db->beginTransaction();

        // 1. Firmen-E-Mail generieren
        $companyEmail = get_unique_company_email(
            $applicant['first_name'],
            $applicant['last_name']
        );

        // 2. Sicheres Initial-Passwort
        $tempPassword = generate_secure_password(16);
        $hashedPw     = password_hash($tempPassword, PASSWORD_BCRYPT);

        // 3. Mitarbeiter-Nummer
        $staffNumber = next_staff_number();

        // 4. User anlegen – Spaltennamen defensiv erkennen
        $colsInsert = $db->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN, 0);
        $pwColInsert = in_array('password_hash', $colsInsert, true) ? 'password_hash' : 'password';

        $db->prepare(
            "INSERT INTO users
             (name, email, company_email, $pwColInsert, temp_password_hash, role,
              permissions, active, must_change_pw, source, applicant_id,
              hired_at, staff_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 'onboarding', ?, NOW(), ?)"
        )->execute([
            $applicant['first_name'] . ' ' . $applicant['last_name'],
            $applicant['email'],           // Private E-Mail
            $companyEmail,                 // Firmen-E-Mail
            $hashedPw,                     // Passwort (bcrypt)
            $hashedPw,                     // Temp-Hash (wird nach Aenderung genullt)
            $role,
            json_encode($permissions),
            $applicantId,
            $staffNumber,
        ]);

        $userId = (int) $db->lastInsertId();

        // 5. Bewerber updaten
        $db->prepare(
            "UPDATE career_applicants
             SET status = 'eingestellt',
                 onboarded_user_id = ?,
                 onboard_mode = 'auto',
                 onboard_role = ?,
                 onboarded_at = NOW()
             WHERE id = ?"
        )->execute([$userId, $role, $applicantId]);

        // 6. Audit-Log
        log_audit_onboard('ONBOARD_AUTO', (string) $applicantId, [
            'user_id'       => $userId,
            'staff_number'  => $staffNumber,
            'company_email' => $companyEmail,
            'role'          => $role,
            'permissions'   => $permissions,
        ]);

        $db->commit();

        // 7. Mail-Versand (optional, hier nur vorbereitet)
        // In Produktion: SendGrid / PHPMailer / SMTP
        $mailSent = false;
        // try {
        //     send_welcome_mail($applicant['email'], $companyEmail, $tempPassword, $staffNumber);
        //     $mailSent = true;
        // } catch (\Exception $e) {
        //     error_log('Onboarding-Mail fehlgeschlagen: ' . $e->getMessage());
        // }

        json_success([
            'success'        => true,
            'mode'           => 'auto',
            'user_id'        => $userId,
            'staff_number'   => $staffNumber,
            'company_email'  => $companyEmail,
            'temp_password'  => $tempPassword,  // NUR im Response, NIE loggen!
            'mail_sent'      => $mailSent,
            'message'        => 'Mitarbeiter-Account erfolgreich erstellt.',
        ]);

    } catch (\Exception $e) {
        $db->rollBack();
        json_error('Onboarding fehlgeschlagen: ' . $e->getMessage(), 500);
    }
}


// =============================================================================
// POST ?action=change_password – Erst-Login Passwort-Aenderung
// =============================================================================
if ($method === 'POST' && $action === 'change_password') {
    // Self-Service: bewusst NUR require_auth(), KEINE Admin-Permission.
    // Der Ziel-User kommt ausschliesslich aus dem Session-Token ($user['sub']) —
    // es gibt keinen Request-Parameter, um das Passwort eines anderen Users zu
    // setzen. Erst-Login (must_change_pw=1, temp_password_hash) und normale
    // eigene Passwort-Aenderung laufen beide ueber diesen Pfad.
    $user = require_auth();
    $body = get_body();
    $newPassword = $body['new_password'] ?? '';

    // User-Daten laden (Name fuer Anti-Social-Engineering-Check)
    try {
        $stmt = $db->prepare("SELECT id, name, email FROM users WHERE id = ?");
        $stmt->execute([$user['sub'] ?? $user['id'] ?? 0]);
        $userData = $stmt->fetch();
    } catch (\Throwable $e) {
        json_error('Datenbankfehler beim Laden des Users: ' . $e->getMessage(), 500);
    }

    if (!$userData) {
        json_error('User nicht gefunden.', 404);
    }

    $nameParts = explode(' ', $userData['name'] ?? '');
    $firstName = $nameParts[0] ?? '';
    $lastName  = $nameParts[count($nameParts) - 1] ?? '';

    // Passwort validieren
    $errors = validate_password($newPassword, $firstName, $lastName);
    if (!empty($errors)) {
        json_error(implode(' ', $errors), 400);
    }

    // Passwort aendern + Flag zuruecksetzen
    // Defensiv: Nur Spalten setzen die tatsaechlich existieren
    $hashedPw = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    try {
        // Pruefen welche Spalten die users-Tabelle hat
        $cols = $db->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN, 0);

        // Spaltennamen defensiv erkennen: password_hash > password > Fehler
        if (in_array('password_hash', $cols, true)) {
            $pwCol = 'password_hash';
        } elseif (in_array('password', $cols, true)) {
            $pwCol = 'password';
        } else {
            json_error('Datenbank-Schema-Fehler: Weder password_hash noch password Spalte gefunden. Bitte setup_db.sql ausfuehren.', 500);
        }

        $setParts = ["`$pwCol` = ?"];
        $params   = [$hashedPw];

        // must_change_pw nur setzen wenn Spalte existiert
        if (in_array('must_change_pw', $cols, true)) {
            $setParts[] = "must_change_pw = 0";
        }

        if (in_array('temp_password_hash', $cols, true)) {
            $setParts[] = "temp_password_hash = NULL";
        }
        if (in_array('pw_changed_at', $cols, true)) {
            $setParts[] = "pw_changed_at = NOW()";
        }

        $sql = "UPDATE users SET " . implode(', ', $setParts) . " WHERE id = ?";
        $params[] = $userData['id'];

        $db->prepare($sql)->execute($params);
    } catch (\Throwable $e) {
        json_error('Datenbankfehler beim Passwort-Update: ' . $e->getMessage(), 500);
    }

    log_audit_onboard('PASSWORD_CHANGED', (string) $userData['id'], [
        'first_login' => true,
    ]);

    json_success([
        'success' => true,
        'message' => 'Passwort erfolgreich geaendert.',
    ]);
}


// ── Fallback ─────────────────────────────────────────────────────────────────
json_error('Ungueltige Anfrage.', 400);
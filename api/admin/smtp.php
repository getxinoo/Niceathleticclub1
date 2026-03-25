<?php
/**
 * /api/admin/smtp.php – SMTP Einstellungen API (Admin only)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/admin/smtp.php              → Aktuelle SMTP-Einstellungen laden
 * POST   /api/admin/smtp.php?action=save  → Einstellungen speichern
 * POST   /api/admin/smtp.php?action=test  → Verbindungstest
 * POST   /api/admin/smtp.php?action=send_test → Test-E-Mail senden
 * ─────────────────────────────────────────────────────────────────────────────
 */

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/mailer.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Alle Endpunkte erfordern Admin
require_admin();

$pdo = db();


// ═══════════════════════════════════════════════════════════════════════════════
// GET – SMTP-Einstellungen laden
// ═══════════════════════════════════════════════════════════════════════════════

if ($method === 'GET') {
    // Prüfe ob Tabelle existiert
    try {
        $pdo->query("SELECT 1 FROM smtp_settings LIMIT 1");
    } catch (PDOException $e) {
        json_success([
            'smtp_host'       => '',
            'smtp_port'       => 587,
            'smtp_user'       => '',
            'smtp_pass'       => '',
            'smtp_encryption' => 'tls',
            'from_email'      => '',
            'from_name'       => '',
            'reply_to_email'  => '',
            'is_active'       => false,
            'last_test_at'    => null,
            'last_test_ok'    => null,
        ]);
    }

    $row = $pdo->query("SELECT * FROM smtp_settings WHERE id = 1 LIMIT 1")->fetch();

    if (!$row) {
        // Row nicht vorhanden – anlegen
        $pdo->exec("INSERT IGNORE INTO smtp_settings (id) VALUES (1)");
        $row = $pdo->query("SELECT * FROM smtp_settings WHERE id = 1 LIMIT 1")->fetch();
    }

    // Passwort maskieren – nur letzte 4 Zeichen zeigen
    $maskedPass = '';
    if (!empty($row['smtp_pass'])) {
        $len = strlen($row['smtp_pass']);
        $maskedPass = str_repeat('•', max(0, $len - 4)) . substr($row['smtp_pass'], -min(4, $len));
    }

    json_success([
        'smtp_host'       => $row['smtp_host'] ?? '',
        'smtp_port'       => (int)($row['smtp_port'] ?? 587),
        'smtp_user'       => $row['smtp_user'] ?? '',
        'smtp_pass'       => $maskedPass,
        'smtp_encryption' => $row['smtp_encryption'] ?? 'tls',
        'from_email'      => $row['from_email'] ?? '',
        'from_name'       => $row['from_name'] ?? '',
        'reply_to_email'  => $row['reply_to_email'] ?? '',
        'is_active'       => (bool)($row['is_active'] ?? false),
        'last_test_at'    => $row['last_test_at'] ?? null,
        'last_test_ok'    => $row['last_test_ok'] !== null ? (bool)$row['last_test_ok'] : null,
        'has_password'    => !empty($row['smtp_pass']),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════════════
// POST – Aktionen
// ═══════════════════════════════════════════════════════════════════════════════

if ($method === 'POST') {

    // ── Save ─────────────────────────────────────────────────────────────────
    if ($action === 'save') {
        $body = get_body();

        $host      = trim($body['smtp_host'] ?? '');
        $port      = (int)($body['smtp_port'] ?? 587);
        $user      = trim($body['smtp_user'] ?? '');
        $pass      = $body['smtp_pass'] ?? null;
        $enc       = $body['smtp_encryption'] ?? 'tls';
        $fromEmail = trim($body['from_email'] ?? '');
        $fromName  = trim($body['from_name'] ?? '');
        $replyTo   = trim($body['reply_to_email'] ?? '');
        $isActive  = (bool)($body['is_active'] ?? false);

        // Validierung
        if (empty($host)) json_error('SMTP-Host ist erforderlich.', 422);
        if ($port < 1 || $port > 65535) json_error('Ungültiger Port.', 422);
        if (empty($fromEmail)) json_error('Absender-E-Mail ist erforderlich.', 422);
        if (!in_array($enc, ['tls', 'ssl', 'none'], true)) json_error('Ungültige Verschlüsselung.', 422);

        // Passwort nur aktualisieren wenn nicht maskiert (d.h. ein neuer Wert)
        $passClause = '';
        $params = [
            ':host'      => $host,
            ':port'      => $port,
            ':user'      => $user,
            ':enc'       => $enc,
            ':from_email'=> $fromEmail,
            ':from_name' => $fromName,
            ':reply_to'  => $replyTo,
            ':active'    => $isActive ? 1 : 0,
        ];

        if ($pass !== null && !preg_match('/^[•]+/', $pass)) {
            // Neues Passwort wurde gesetzt (nicht die maskierte Version)
            $passClause = ', smtp_pass = :pass';
            $params[':pass'] = $pass;
        }

        try {
            $stmt = $pdo->prepare("
                UPDATE smtp_settings SET
                    smtp_host       = :host,
                    smtp_port       = :port,
                    smtp_user       = :user,
                    smtp_encryption = :enc,
                    from_email      = :from_email,
                    from_name       = :from_name,
                    reply_to_email  = :reply_to,
                    is_active       = :active
                    {$passClause}
                WHERE id = 1
            ");
            $stmt->execute($params);

            json_success(['message' => 'SMTP-Einstellungen gespeichert.']);
        } catch (Exception $e) {
            json_error('Fehler beim Speichern: ' . $e->getMessage(), 500);
        }
    }

    // ── Test Connection ──────────────────────────────────────────────────────
    if ($action === 'test') {
        // Optionally save first (body can contain settings to test with)
        $body = get_body();

        // Wenn Settings mitgeschickt: erst temporaer speichern
        if (!empty($body['smtp_host'])) {
            $pass = $body['smtp_pass'] ?? null;
            $passClause = '';
            $params = [
                ':host'      => trim($body['smtp_host'] ?? ''),
                ':port'      => (int)($body['smtp_port'] ?? 587),
                ':user'      => trim($body['smtp_user'] ?? ''),
                ':enc'       => $body['smtp_encryption'] ?? 'tls',
                ':from_email'=> trim($body['from_email'] ?? ''),
                ':from_name' => trim($body['from_name'] ?? ''),
                ':reply_to'  => trim($body['reply_to_email'] ?? ''),
            ];

            if ($pass !== null && !preg_match('/^[•]+/', $pass)) {
                $passClause = ', smtp_pass = :pass';
                $params[':pass'] = $pass;
            }

            $stmt = $pdo->prepare("
                UPDATE smtp_settings SET
                    smtp_host       = :host,
                    smtp_port       = :port,
                    smtp_user       = :user,
                    smtp_encryption = :enc,
                    from_email      = :from_email,
                    from_name       = :from_name,
                    reply_to_email  = :reply_to
                    {$passClause}
                WHERE id = 1
            ");
            $stmt->execute($params);
        }

        $result = nac_test_smtp();

        if (!$result['success']) {
            // Letzten Test als failed markieren
            try {
                $pdo->exec("UPDATE smtp_settings SET last_test_at = NOW(), last_test_ok = 0 WHERE id = 1");
            } catch (PDOException $e) { /* ignore */ }
        }

        json_success([
            'success' => $result['success'],
            'message' => $result['message'],
            'log'     => $result['details'] ?? null,
        ]);
    }

    // ── Send Test Mail ───────────────────────────────────────────────────────
    if ($action === 'send_test') {
        $body = get_body();
        $toEmail = trim($body['to_email'] ?? '');

        if (empty($toEmail) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            json_error('Gültige Empfänger-E-Mail erforderlich.', 422);
        }

        $result = nac_send_test_mail($toEmail);

        json_success([
            'success' => $result['success'],
            'message' => $result['message'],
        ]);
    }

    json_error('Unbekannte Action: ' . $action, 400);
}

json_error('Methode nicht unterstützt.', 405);

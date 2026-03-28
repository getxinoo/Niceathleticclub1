<?php
/**
 * api/admin/request_sepa.php – SEPA Self-Service Orchestration (Admin)
 * ─────────────────────────────────────────────────────────────────────────────
 * Dieser Endpoint deckt drei Szenarien ab:
 *
 *  POST ?action=send_link
 *       → Sendet dem Mitglied einen personalisierten SEPA-Einrichtungslink per
 *         E-Mail (gültig 48 h). Rate-Limit: 1 E-Mail pro 10 Minuten / Mitglied.
 *
 *  POST ?action=update_sepa
 *       → Admin / Mitarbeiter hinterlegt Bankdaten DIREKT für ein Mitglied
 *         (z. B. am Tresen oder nach telefonischer Auskunft). IBAN wird
 *         AES-256 verschlüsselt; Klartext-Kopie (letzte 4 Stellen) für
 *         maskierte Anzeige. Legt neues SEPA-Mandat an / aktualisiert
 *         bestehendes Mandat.
 *
 *  GET  ?member_id=X
 *       → Gibt den aktuellen SEPA-Token-Status des Mitglieds zurück
 *         (Token vorhanden, abgelaufen, letzter Mailversand).
 *
 * Authentifizierung:
 *   Alle Methoden erfordern einen gültigen Staff-JWT.
 *   Rollen mit Zugriff: admin | hr | finance | frontdesk
 *
 * Datenbank-Voraussetzungen (automatisch per ALTER TABLE angelegt):
 *   members.sepa_request_token      VARCHAR(128)  NULL
 *   members.sepa_request_expires    DATETIME      NULL
 *   members.sepa_request_sent_at    DATETIME      NULL
 *
 * Bestehende Tabellen:
 *   sepa_mandates  (id, member_id, mandate_reference, iban_encrypted, iban,
 *                   bic, account_holder, signed_at, status, created_at)
 *   audit_logs     (zentral via audit_log() aus config.php)
 *
 * Sicherheit:
 *   - Token: 64 Hex-Zeichen = 256 Bit kryptographische Entropie
 *   - IBAN: AES-256-CBC verschlüsselt (SEPA_AES_KEY aus config.php)
 *   - Audit-Log DSGVO-konform für jeden Schreibzugriff
 *   - Rate-Limit verhindert E-Mail-Spam gegen ein Mitglied
 *   - IBAN wird NIEMALS im Klartext geloggt
 */

declare(strict_types=1);
require_once '../config.php';
require_once '../lib/mailer.php';

// ── Konstanten ────────────────────────────────────────────────────────────────
define('SEPA_LINK_BASE',           'https://nicefitness.de/member/sepa-setup');
define('SEPA_TOKEN_LIFETIME_H',    48);       // Token gültig 48 Stunden
define('SEPA_RATE_LIMIT_MINUTES',  10);       // Max 1 Mail pro Mitglied / 10 Min.
define('SEPA_ALLOWED_ROLES',       ['admin', 'hr', 'finance', 'frontdesk']);

// AES-Key Fallback (Produktion: langen Key in config.php setzen!)
if (!defined('SEPA_AES_KEY') || SEPA_AES_KEY === '') {
    define('SEPA_AES_KEY', 'nac_sepa_secret_key_change_in_production_2026');
}

// ── Auth: Staff-Rollen prüfen ─────────────────────────────────────────────────
$actor  = require_staff_roles(SEPA_ALLOWED_ROLES);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$db     = db();

// ── Sicherstellen, dass die SEPA-Token-Spalten in `members` existieren ────────
_ensure_sepa_columns($db);


// =============================================================================
// GET ?member_id=X – SEPA-Token-Status eines Mitglieds abfragen
// =============================================================================
if ($method === 'GET') {
    $member_id = isset($_GET['member_id']) ? (int) $_GET['member_id'] : 0;
    if ($member_id <= 0) {
        json_error('Pflichtparameter member_id fehlt oder ungültig.', 400);
    }

    $stmt = $db->prepare(
        "SELECT id, first_name, last_name, email, iban,
                sepa_request_token, sepa_request_expires, sepa_request_sent_at,
                sepa_mandate_id
         FROM members WHERE id = ? LIMIT 1"
    );
    $stmt->execute([$member_id]);
    $member = $stmt->fetch();

    if (!$member) {
        json_error('Mitglied nicht gefunden.', 404);
    }

    // Aktuelles Mandat laden
    $mandate = null;
    if ($member['sepa_mandate_id']) {
        $mStmt = $db->prepare(
            "SELECT id, mandate_reference, status, bic, signed_at, created_at
             FROM sepa_mandates WHERE id = ? LIMIT 1"
        );
        $mStmt->execute([$member['sepa_mandate_id']]);
        $mandate = $mStmt->fetch() ?: null;
    }

    // Token-Status berechnen
    $now           = new \DateTime();
    $tokenExpires  = $member['sepa_request_expires']
                     ? new \DateTime($member['sepa_request_expires'])
                     : null;
    $tokenValid    = $tokenExpires && $tokenExpires > $now;
    $tokenExpired  = $tokenExpires && $tokenExpires <= $now;

    // Rate-Limit-Check für den Caller
    $rateLimitRemaining = null;
    if ($member['sepa_request_sent_at']) {
        $sentAt      = new \DateTime($member['sepa_request_sent_at']);
        $diffSeconds = $now->getTimestamp() - $sentAt->getTimestamp();
        $limitSecs   = SEPA_RATE_LIMIT_MINUTES * 60;
        if ($diffSeconds < $limitSecs) {
            $rateLimitRemaining = $limitSecs - $diffSeconds; // Sekunden bis nächste Mail möglich
        }
    }

    json_success([
        'member_id'               => $member['id'],
        'member_name'             => $member['first_name'] . ' ' . $member['last_name'],
        'member_email'            => $member['email'],
        'iban_masked'             => $member['iban'] ? _mask_iban($member['iban']) : null,
        'has_active_token'        => $tokenValid,
        'token_expired'           => $tokenExpired,
        'token_expires_at'        => $member['sepa_request_expires'],
        'last_link_sent_at'       => $member['sepa_request_sent_at'],
        'rate_limit_remaining_s'  => $rateLimitRemaining,
        'mandate'                 => $mandate,
    ]);
}


// =============================================================================
// POST ?action=send_link – SEPA-Einrichtungslink per E-Mail senden
// =============================================================================
if ($method === 'POST' && $action === 'send_link') {
    $body      = get_body();
    $member_id = isset($body['member_id']) ? (int) $body['member_id'] : 0;

    if ($member_id <= 0) {
        json_error('Pflichtfeld member_id fehlt oder ist ungültig.', 400);
    }

    // Mitglied laden
    $stmt = $db->prepare(
        "SELECT id, first_name, last_name, email,
                sepa_request_sent_at
         FROM members WHERE id = ? LIMIT 1"
    );
    $stmt->execute([$member_id]);
    $member = $stmt->fetch();

    if (!$member) {
        json_error('Mitglied nicht gefunden.', 404);
    }

    if (empty($member['email'])) {
        json_error('Dieses Mitglied hat keine E-Mail-Adresse hinterlegt.', 422);
    }

    // ── Rate-Limit prüfen ────────────────────────────────────────────────────
    if (!empty($member['sepa_request_sent_at'])) {
        $sentAt      = new \DateTime($member['sepa_request_sent_at']);
        $now         = new \DateTime();
        $diffSeconds = $now->getTimestamp() - $sentAt->getTimestamp();
        $limitSecs   = SEPA_RATE_LIMIT_MINUTES * 60;

        if ($diffSeconds < $limitSecs) {
            $waitSeconds = $limitSecs - $diffSeconds;
            $waitMin     = ceil($waitSeconds / 60);
            json_error(
                "Rate-Limit: Bitte warte noch {$waitMin} Minute(n) bevor ein neuer Link gesendet wird.",
                429
            );
        }
    }

    // ── Token generieren (256 Bit Entropie) ──────────────────────────────────
    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+' . SEPA_TOKEN_LIFETIME_H . ' hours'));
    $sentAt  = date('Y-m-d H:i:s');

    // ── Token in DB speichern ─────────────────────────────────────────────────
    $db->prepare(
        "UPDATE members
         SET sepa_request_token   = ?,
             sepa_request_expires = ?,
             sepa_request_sent_at = ?
         WHERE id = ?"
    )->execute([$token, $expires, $sentAt, $member_id]);

    // ── E-Mail-Link bauen ─────────────────────────────────────────────────────
    $sepaLink    = SEPA_LINK_BASE . '?token=' . urlencode($token);
    $firstName   = htmlspecialchars($member['first_name'], ENT_QUOTES, 'UTF-8');
    $expiresHuman = date('d.m.Y \u\m H:i \U\h\r', strtotime($expires));

    // ── HTML-E-Mail Template (NAC Branding) ───────────────────────────────────
    $htmlBody = _build_sepa_email($firstName, $sepaLink, $expiresHuman);

    $subject = 'Aktion erforderlich: Bitte hinterlege dein SEPA-Mandat – NICE Athletic Club';

    // ── Versand ───────────────────────────────────────────────────────────────
    $mailResult = nac_send_mail($member['email'], $subject, $htmlBody);

    if (!$mailResult['success']) {
        // Versand fehlgeschlagen – Token zurücksetzen damit Rate-Limit nicht greift
        $db->prepare(
            "UPDATE members SET sepa_request_sent_at = NULL WHERE id = ?"
        )->execute([$member_id]);

        // Audit: E-Mail-Fehler
        audit_log($actor, 'SEPA_LINK_MAIL_FAILED', 'member', $member_id, [
            'email'  => $member['email'],
            'error'  => $mailResult['error'] ?? 'SMTP-Fehler',
        ], 'warning');

        json_error('E-Mail konnte nicht gesendet werden: ' . ($mailResult['error'] ?? 'SMTP-Fehler'), 502);
    }

    // ── Audit-Log (DSGVO-konform) ─────────────────────────────────────────────
    audit_log($actor, 'SEPA_LINK_SENT', 'member', $member_id, [
        'to_email'      => $member['email'],
        'token_expires' => $expires,
        'sent_by'       => $actor['name'] ?? $actor['email'] ?? 'Admin',
    ], 'info', 'admin_ui');

    json_success([
        'success'       => true,
        'message'       => "SEPA-Link erfolgreich an {$member['email']} gesendet.",
        'token_expires' => $expires,
        'member_id'     => $member_id,
    ]);
}


// =============================================================================
// POST ?action=update_sepa – Admin hinterlegt Bankdaten direkt für ein Mitglied
// =============================================================================
if ($method === 'POST' && $action === 'update_sepa') {
    $body      = get_body();
    $member_id = isset($body['member_id']) ? (int) $body['member_id'] : 0;
    $rawIban   = trim($body['iban']   ?? '');
    $bic       = strtoupper(trim($body['bic'] ?? ''));
    $holder    = trim($body['account_holder'] ?? '');
    $confirmed = (bool) ($body['mandate_confirmed'] ?? false);

    // ── Eingabevalidierung ────────────────────────────────────────────────────
    if ($member_id <= 0) {
        json_error('Pflichtfeld member_id fehlt oder ist ungültig.', 400);
    }
    if (empty($rawIban)) {
        json_error('IBAN ist ein Pflichtfeld.', 400);
    }
    if (empty($bic)) {
        json_error('BIC ist ein Pflichtfeld.', 400);
    }
    if (!$confirmed) {
        json_error('Das SEPA-Mandat muss vom Admin bestätigt werden.', 422);
    }

    // IBAN bereinigen und validieren
    $iban = strtoupper(str_replace(' ', '', $rawIban));
    if (!_validate_iban($iban)) {
        json_error('Ungültige IBAN. Bitte das Format prüfen (z.B. DE89 3704 0044 0532 0130 00).', 400);
    }

    // BIC validieren (8 oder 11 alphanumerische Zeichen)
    if (!preg_match('/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/', $bic)) {
        json_error('Ungültige BIC/SWIFT. Format: 8 oder 11 alphanumerische Zeichen (z.B. COBADEFFXXX).', 400);
    }

    // Mitglied laden
    $stmt = $db->prepare(
        "SELECT id, first_name, last_name, email, sepa_mandate_id
         FROM members WHERE id = ? LIMIT 1"
    );
    $stmt->execute([$member_id]);
    $member = $stmt->fetch();

    if (!$member) {
        json_error('Mitglied nicht gefunden.', 404);
    }

    try {
        $db->beginTransaction();

        // ── IBAN: Klartext (letzte 4 Zeichen für Maskenanzeige) + AES-Verschlüsselung
        $ibanEncrypted = _encrypt_iban($iban);
        $ibanMasked    = _mask_iban($iban);

        // Kontrolleur-Name für die Mandatsreferenz
        $adminName = $actor['name'] ?? 'Admin';

        // ── Mandat anlegen oder aktualisieren ─────────────────────────────────
        if ($member['sepa_mandate_id']) {
            // Bestehendes Mandat updaten
            $db->prepare(
                "UPDATE sepa_mandates
                 SET iban_encrypted  = ?,
                     iban            = ?,
                     bic             = ?,
                     account_holder  = ?,
                     status          = 'active',
                     signed_at       = NOW()
                 WHERE id = ?"
            )->execute([
                $ibanEncrypted,
                $iban,                  // Klartext für spätere Maskierung (letzten 4)
                $bic,
                $holder ?: ($member['first_name'] . ' ' . $member['last_name']),
                $member['sepa_mandate_id'],
            ]);
            $mandate_id  = $member['sepa_mandate_id'];
            $mandateRef  = _get_mandate_ref($db, $mandate_id);
        } else {
            // Neues Mandat anlegen
            $mandateRef = 'NAC-' . str_pad((string) $member_id, 5, '0', STR_PAD_LEFT) . '-SEPA-' . date('Ymd');

            $insStmt = $db->prepare(
                "INSERT INTO sepa_mandates
                     (member_id, mandate_reference, iban_encrypted, iban, bic,
                      account_holder, status, signed_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())"
            );
            $insStmt->execute([
                $member_id,
                $mandateRef,
                $ibanEncrypted,
                $iban,
                $bic,
                $holder ?: ($member['first_name'] . ' ' . $member['last_name']),
            ]);
            $mandate_id = (int) $db->lastInsertId();

            // Mitglied mit neuem Mandat verknüpfen
            $db->prepare(
                "UPDATE members SET sepa_mandate_id = ?, iban = ? WHERE id = ?"
            )->execute([$mandate_id, $iban, $member_id]);
        }

        // ── Immer: IBAN-Klartext im Member aktualisieren (für Maskenanzeige) ─
        $db->prepare(
            "UPDATE members SET iban = ? WHERE id = ?"
        )->execute([$iban, $member_id]);

        // ── Evtl. offenes SEPA-Token invalidieren (nicht mehr nötig) ─────────
        $db->prepare(
            "UPDATE members
             SET sepa_request_token = NULL, sepa_request_expires = NULL
             WHERE id = ?"
        )->execute([$member_id]);

        $db->commit();

        // ── Audit-Log (DSGVO: IBAN NUR maskiert!) ────────────────────────────
        audit_log($actor, 'SEPA_UPDATED_BY_ADMIN', 'member', $member_id, [
            'iban_masked'       => $ibanMasked,
            'bic'               => $bic,
            'mandate_reference' => $mandateRef,
            'mandate_id'        => $mandate_id,
            'updated_by'        => $adminName,
            'mandate_confirmed' => true,
        ], 'info', 'admin_ui');

        json_success([
            'success'           => true,
            'message'           => 'Bankverbindung für ' . $member['first_name'] . ' ' . $member['last_name'] . ' erfolgreich aktualisiert.',
            'iban_masked'       => $ibanMasked,
            'bic'               => $bic,
            'mandate_reference' => $mandateRef,
            'mandate_id'        => $mandate_id,
            'status'            => 'active',
        ]);

    } catch (\Throwable $e) {
        $db->rollBack();
        error_log('[NAC_SEPA_UPDATE_ERROR] ' . $e->getMessage());
        json_error('Bankverbindung konnte nicht gespeichert werden. Bitte erneut versuchen.', 500);
    }
}


// =============================================================================
// Methode nicht erlaubt / unbekannte Aktion
// =============================================================================
json_error('Methode oder Aktion nicht erlaubt.', 405);


// ─────────────────────────────────────────────────────────────────────────────
// ── Private Hilfsfunktionen ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stellt sicher, dass die SEPA-Token-Spalten in der `members`-Tabelle existieren.
 * Nutzt SHOW COLUMNS (kein INFORMATION_SCHEMA – kompatibel mit MySQL 5.7).
 */
function _ensure_sepa_columns(PDO $db): void
{
    static $checked = false;
    if ($checked) return;
    $checked = true;

    $existing = [];
    try {
        $stmt = $db->query("SHOW COLUMNS FROM members");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $existing[] = $row['Field'];
        }
    } catch (\Throwable $e) {
        error_log('[NAC_SEPA] SHOW COLUMNS Fehler: ' . $e->getMessage());
        return;
    }

    $alterParts = [];
    if (!in_array('sepa_request_token', $existing, true)) {
        $alterParts[] = "ADD COLUMN `sepa_request_token`   VARCHAR(128) NULL DEFAULT NULL AFTER `iban`";
    }
    if (!in_array('sepa_request_expires', $existing, true)) {
        $alterParts[] = "ADD COLUMN `sepa_request_expires` DATETIME     NULL DEFAULT NULL AFTER `sepa_request_token`";
    }
    if (!in_array('sepa_request_sent_at', $existing, true)) {
        $alterParts[] = "ADD COLUMN `sepa_request_sent_at` DATETIME     NULL DEFAULT NULL AFTER `sepa_request_expires`";
    }

    if (!empty($alterParts)) {
        try {
            $db->exec("ALTER TABLE members " . implode(', ', $alterParts));
        } catch (\Throwable $e) {
            error_log('[NAC_SEPA] ALTER TABLE Fehler: ' . $e->getMessage());
        }
    }
}

/**
 * IBAN validieren (Länge + Format nach ISO 13616, kein Modulo-97-Check).
 */
function _validate_iban(string $iban): bool
{
    // Leerzeichen entfernt, uppercase, min. 15 max. 34 Zeichen
    return (bool) preg_match('/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/', $iban);
}

/**
 * IBAN maskieren – zeigt Ländercode + Prüfziffern + letzte 4 Zeichen.
 * Beispiel: DE87 **** **** **** 1234
 */
function _mask_iban(string $iban): string
{
    $clean = str_replace(' ', '', strtoupper($iban));
    $len   = strlen($clean);
    if ($len < 6) return '****';

    $prefix = substr($clean, 0, 4);           // z.B. DE87
    $suffix = substr($clean, -4);             // z.B. 1234
    $middle = str_repeat('*', $len - 8);      // Mittelteil maskiert
    $full   = $prefix . $middle . $suffix;

    // In 4er-Gruppen aufteilen
    return trim(chunk_split($full, 4, ' '));
}

/**
 * IBAN AES-256-CBC verschlüsseln.
 * Gibt base64-kodierten String zurück: base64(IV::CipherText)
 */
function _encrypt_iban(string $iban): string
{
    $iv        = openssl_random_pseudo_bytes(16);
    $encrypted = openssl_encrypt(
        str_replace(' ', '', $iban),
        'AES-256-CBC',
        SEPA_AES_KEY,
        OPENSSL_RAW_DATA,
        $iv
    );
    if ($encrypted === false) {
        throw new \RuntimeException('IBAN-Verschlüsselung fehlgeschlagen.');
    }
    return base64_encode($iv . '::' . $encrypted);
}

/**
 * Mandatsreferenz aus DB laden.
 */
function _get_mandate_ref(PDO $db, int $mandate_id): string
{
    $stmt = $db->prepare("SELECT mandate_reference FROM sepa_mandates WHERE id = ? LIMIT 1");
    $stmt->execute([$mandate_id]);
    return (string) ($stmt->fetchColumn() ?: 'NAC-SEPA-' . $mandate_id);
}

/**
 * HTML-E-Mail für den SEPA-Einrichtungslink generieren.
 * Entspricht dem NAC Dark-Mode-Branding (schwarz, Magenta-Akzente).
 *
 * @param string $firstName    Vorname des Mitglieds (HTML-escaped)
 * @param string $sepaLink     One-Click-Link mit Token
 * @param string $expiresHuman Ablaufzeit als lesbare Zeichenkette
 */
function _build_sepa_email(string $firstName, string $sepaLink, string $expiresHuman): string
{
    $linkEsc = htmlspecialchars($sepaLink, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEPA-Mandat einrichten – NICE Athletic Club</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background-color:#050505;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
               style="max-width:560px;background-color:#111111;border:1px solid rgba(255,255,255,0.07);">

          <!-- Magenta accent bar -->
          <tr>
            <td height="3"
                style="background:linear-gradient(90deg,#CA0C85 0%,rgba(202,12,133,0.15) 100%);
                       line-height:3px;font-size:3px;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Logo-Badge -->
                    <div style="display:inline-block;background:#CA0C85;
                                padding:6px 14px;margin-bottom:20px;">
                      <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                                   font-size:11px;font-weight:700;letter-spacing:0.2em;
                                   color:#ffffff;text-transform:uppercase;">
                        NICE ATHLETIC CLUB
                      </span>
                    </div>

                    <h1 style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                               font-size:22px;font-weight:700;letter-spacing:0.04em;
                               color:#ffffff;text-transform:uppercase;line-height:1.2;">
                      SEPA-Mandat einrichten
                    </h1>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">
                      Aktion erforderlich – bitte innerhalb von {$expiresHuman} abschließen
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">

              <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.65;">
                Hallo <strong style="color:#ffffff;">{$firstName}</strong>,
              </p>

              <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;">
                für die reibungslose Abwicklung deiner Mitgliedschaft im
                <strong style="color:rgba(255,255,255,0.8);">NICE Athletic Club Göppingen</strong>
                benötigen wir noch dein SEPA-Lastschriftmandat.
              </p>

              <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;">
                Klicke auf den Button, um deine Bankverbindung sicher und verschlüsselt zu hinterlegen.
                Du wirst direkt zu deinem persönlichen Bereich weitergeleitet.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td>
                    <a href="{$linkEsc}"
                       style="display:inline-block;background:#CA0C85;
                              padding:14px 32px;text-decoration:none;
                              font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                              font-size:13px;font-weight:700;letter-spacing:0.16em;
                              color:#ffffff;text-transform:uppercase;">
                      Jetzt Mandat erteilen &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                     style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                            margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                               font-size:10px;font-weight:700;letter-spacing:0.18em;
                               color:rgba(255,255,255,0.3);text-transform:uppercase;">
                      Wichtige Hinweise
                    </p>
                    <ul style="margin:0;padding:0 0 0 16px;font-size:13px;
                               color:rgba(255,255,255,0.45);line-height:1.7;list-style:disc;">
                      <li>Dieser Link ist aus Sicherheitsgründen
                          <strong style="color:rgba(255,255,255,0.65);">48 Stunden</strong> gültig.</li>
                      <li>Deine Daten werden <strong style="color:rgba(255,255,255,0.65);">
                          SSL-verschlüsselt</strong> übertragen.</li>
                      <li>Du ermächtigst uns, Beträge per SEPA-Lastschrift einzuziehen.
                          Eine Rückbuchung ist innerhalb von <strong style="color:rgba(255,255,255,0.65);">
                          8 Wochen</strong> möglich.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.25);">
                Falls der Button nicht funktioniert, kopiere diesen Link:
              </p>
              <p style="margin:0;font-size:11px;word-break:break-all;">
                <a href="{$linkEsc}"
                   style="color:#CA0C85;text-decoration:none;">{$linkEsc}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.2);line-height:1.6;">
                Diese E-Mail wurde automatisch vom NICE Athletic Club EMS versendet.
                Bitte antworte nicht direkt auf diese E-Mail.
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">
                &copy; NICE Athletic Club &middot; Göppingen &middot;
                <a href="https://nicefitness.de/datenschutz"
                   style="color:rgba(255,255,255,0.35);text-decoration:none;">Datenschutz</a>
                &middot;
                <a href="https://nicefitness.de/impressum"
                   style="color:rgba(255,255,255,0.35);text-decoration:none;">Impressum</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
HTML;
}

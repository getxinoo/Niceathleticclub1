<?php
/**
 * api/member/sepa.php – IBAN Self-Service fuer Mitglieder
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/member/sepa.php                    → SEPA-Status + maskierte IBAN
 * POST /api/member/sepa.php?action=update_iban → Neue IBAN speichern
 *
 * Tabellen-Voraussetzungen:
 *   sepa_mandates  (id, member_id, mandate_reference, iban_encrypted, bic,
 *                   account_holder, signed_at, status, created_at, revoked_at)
 *   members        (id, first_name, last_name, iban, sepa_mandate_id,
 *                   cancellation_limit_hours)
 *   audit_logs     (user_id, action, entity_type, entity_id, details JSON)
 *
 * Sicherheits-Hinweise:
 *   - IBAN wird in der DB AES-256 verschluesselt gespeichert (sepa_mandates.iban_encrypted)
 *   - Fuer die maskierte Anzeige wird nur members.iban (Klartext, letzte 4 Zeichen) genutzt
 *   - In Produktion: AES-Key in config.php als Konstante definieren!
 */
declare(strict_types=1);
require_once '../config.php';

// ── Auth: Nur eingeloggte Mitglieder ─────────────────────────────────────────
$user = require_auth();
$member_id = $user['member_id'] ?? null;
if (!$member_id) {
    json_error('Nur fuer Mitglieder verfuegbar.', 403);
}
$member_id = (int) $member_id;

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$db     = db();

// ── AES-Schluessel (in Produktion durch langen, zufaelligen String ersetzen!) ─
// Konstante hier definieren, falls noch nicht in config.php vorhanden
if (!defined('SEPA_AES_KEY')) {
    define('SEPA_AES_KEY', 'nac_sepa_secret_key_change_in_production_2026');
}

// ── Helper: IBAN maskieren ───────────────────────────────────────────────────
function mask_iban(string $iban): string
{
    // Leerzeichen entfernen fuer konsistente Verarbeitung
    $clean = str_replace(' ', '', $iban);
    $len   = strlen($clean);

    if ($len < 6) return '****';

    // Erste 4 Zeichen (Laendercode + Pruefziffer) + letzte 2 Zeichen sichtbar
    // Rest maskiert, formatiert in 4er-Gruppen
    $prefix  = substr($clean, 0, 4);
    $suffix  = substr($clean, -2);
    $middle  = str_repeat('*', $len - 6);
    $full    = $prefix . $middle . $suffix;

    // In 4er-Gruppen formatieren
    return trim(chunk_split($full, 4, ' '));
}

// ── Helper: IBAN verschluesseln ──────────────────────────────────────────────
function encrypt_iban(string $iban): string
{
    $iv = openssl_random_pseudo_bytes(16);
    $encrypted = openssl_encrypt(
        str_replace(' ', '', $iban),
        'AES-256-CBC',
        SEPA_AES_KEY,
        0,
        $iv
    );
    // IV + verschluesselter Text als Base64 speichern
    return base64_encode($iv . '::' . $encrypted);
}

// ── Helper: IBAN entschluesseln ──────────────────────────────────────────────
function decrypt_iban(string $encrypted_data): ?string
{
    $data = base64_decode($encrypted_data);
    if ($data === false) return null;

    $parts = explode('::', $data, 2);
    if (count($parts) !== 2) return null;

    [$iv, $encrypted] = $parts;
    $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', SEPA_AES_KEY, 0, $iv);
    return $decrypted !== false ? $decrypted : null;
}

// ── Helper: IBAN validieren (Laenge + Format, kein Modulo-Check) ─────────────
function validate_iban(string $iban): bool
{
    $clean = strtoupper(str_replace(' ', '', $iban));
    // Mindestens 15 Zeichen, maximal 34 (ISO 13616)
    // Beginnt mit 2 Buchstaben + 2 Ziffern
    return (bool) preg_match('/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/', $clean);
}

// ── Helper: Audit-Log ────────────────────────────────────────────────────────
function log_audit_sepa(string $action_name, string $entity_id, array $details = []): void
{
    global $user, $db;
    $db->prepare(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, 'sepa', ?, ?)"
    )->execute([
        $user['sub'] ?? $user['id'] ?? 0,
        $action_name,
        $entity_id,
        json_encode($details, JSON_UNESCAPED_UNICODE),
    ]);
}


// =============================================================================
// GET – SEPA-Status abrufen (maskierte IBAN, Mandatsinfo, Storno-Frist)
// =============================================================================
if ($method === 'GET' && !$action) {
    try {
        // Member-Daten + SEPA-Mandat joinen
        $stmt = $db->prepare(
            "SELECT m.iban, m.cancellation_limit_hours,
                    sm.id AS mandate_id, sm.mandate_reference, sm.status AS mandate_status,
                    sm.signed_at, sm.bic, sm.account_holder,
                    sm.created_at AS mandate_created
             FROM members m
             LEFT JOIN sepa_mandates sm ON sm.id = m.sepa_mandate_id AND sm.status != 'expired'
             WHERE m.id = ?
             LIMIT 1"
        );
        $stmt->execute([$member_id]);
        $row = $stmt->fetch();

        if (!$row) {
            json_error('Mitglied nicht gefunden.', 404);
        }

        // Naechstes Einzugsdatum berechnen (immer 1. des Folgemonats)
        $next_collection = null;
        if ($row['mandate_status'] === 'active') {
            $next_month = new \DateTime('first day of next month');
            $next_collection = $next_month->format('Y-m-d');
        }

        // Letzte erfolgreiche Transaktion als letztes Einzugsdatum
        $last_collection = null;
        if ($row['mandate_id']) {
            $txStmt = $db->prepare(
                "SELECT processed_at FROM transactions
                 WHERE mandate_id = ? AND status = 'success'
                 ORDER BY processed_at DESC LIMIT 1"
            );
            $txStmt->execute([$row['mandate_id']]);
            $txRow = $txStmt->fetch();
            if ($txRow) {
                $last_collection = $txRow['processed_at'];
            }
        }

        json_success([
            'iban_masked'               => $row['iban'] ? mask_iban($row['iban']) : null,
            'mandate_reference'         => $row['mandate_reference'] ?? null,
            'status'                    => $row['mandate_status'] ?? 'none',
            'signed_at'                 => $row['signed_at'] ?? null,
            'bic'                       => $row['bic'] ?? null,
            'account_holder'            => $row['account_holder'] ?? null,
            'next_collection_date'      => $next_collection,
            'last_collection_date'      => $last_collection,
            'cancellation_limit_hours'  => (int) ($row['cancellation_limit_hours'] ?? 24),
        ]);

    } catch (\Exception $e) {
        json_error('Fehler beim Laden der SEPA-Daten: ' . $e->getMessage(), 500);
    }
}


// =============================================================================
// POST ?action=update_iban – Neue IBAN speichern
// =============================================================================
if ($method === 'POST' && $action === 'update_iban') {
    $body = get_body();
    $new_iban = trim($body['iban'] ?? '');

    if (empty($new_iban)) {
        json_error('IBAN ist ein Pflichtfeld.', 400);
    }

    // Leerzeichen entfernen und uppercase
    $new_iban_clean = strtoupper(str_replace(' ', '', $new_iban));

    if (!validate_iban($new_iban_clean)) {
        json_error('Ungueltige IBAN. Bitte pruefe das Format (z.B. DE89 3704 0044 0532 0130 00).', 400);
    }

    try {
        $db->beginTransaction();

        // 1. IBAN im Klartext in members speichern (fuer maskierte Anzeige)
        $db->prepare(
            "UPDATE members SET iban = ? WHERE id = ?"
        )->execute([$new_iban_clean, $member_id]);

        // 2. Aktives SEPA-Mandat updaten (falls vorhanden)
        $mandateStmt = $db->prepare(
            "SELECT id FROM sepa_mandates
             WHERE member_id = ? AND status = 'active'
             ORDER BY created_at DESC LIMIT 1"
        );
        $mandateStmt->execute([$member_id]);
        $mandate = $mandateStmt->fetch();

        if ($mandate) {
            // IBAN verschluesselt im Mandat aktualisieren
            $encrypted = encrypt_iban($new_iban_clean);
            $db->prepare(
                "UPDATE sepa_mandates SET iban_encrypted = ? WHERE id = ?"
            )->execute([$encrypted, $mandate['id']]);
        }

        // 3. Audit-Log (DSGVO: keine vollstaendige IBAN loggen!)
        log_audit_sepa('IBAN_UPDATE', (string) $member_id, [
            'iban_masked' => mask_iban($new_iban_clean),
            'had_mandate' => $mandate ? true : false,
        ]);

        $db->commit();

        json_success([
            'success'     => true,
            'message'     => 'IBAN erfolgreich aktualisiert.',
            'iban_masked' => mask_iban($new_iban_clean),
        ]);

    } catch (\Exception $e) {
        $db->rollBack();
        json_error('IBAN konnte nicht aktualisiert werden: ' . $e->getMessage(), 500);
    }
}


// ── Fallback ─────────────────────────────────────────────────────────────────
json_error('Ungueltige Anfrage.', 400);

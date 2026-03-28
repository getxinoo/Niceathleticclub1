<?php
/**
 * api/member/sepa.php – IBAN Self-Service fuer Mitglieder
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/member/sepa.php                    → SEPA-Status + maskierte IBAN
 * POST /api/member/sepa.php?action=update_iban → Neue IBAN & neues Mandat speichern
 *
 * Tabellen-Voraussetzungen:
 * sepa_mandates  (id, member_id, mandate_reference, iban_encrypted, bic,
 * account_holder, signed_at, status, created_at, revoked_at)
 * members        (id, first_name, last_name, iban, sepa_mandate_id,
 * cancellation_limit_hours)
 * audit_logs     (user_id, action, entity_type, entity_id, details JSON)
 *
 * Sicherheits-Hinweise:
 * - IBAN wird in der DB AES-256 verschluesselt gespeichert (sepa_mandates.iban_encrypted)
 * - Fuer die maskierte Anzeige wird nur members.iban (Klartext, letzte 4 Zeichen) genutzt
 * - In Produktion: AES-Key in config.php als Konstante definieren!
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
        if (($row['mandate_status'] ?? '') === 'active') {
            $next_month = new \DateTime('first day of next month');
            $next_collection = $next_month->format('Y-m-d');
        }

        // Letzte erfolgreiche Transaktion als letztes Einzugsdatum
        $last_collection = null;
        if (!empty($row['mandate_id'])) {
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
// POST ?action=update_iban – Neue IBAN & Neues Mandat speichern
// =============================================================================
if ($method === 'POST' && $action === 'update_iban') {
    $body = get_body();
    $new_iban = trim($body['iban'] ?? '');
    $new_bic  = trim($body['bic'] ?? '');
    $consent  = $body['consent'] ?? false; // Die Checkbox aus dem Frontend

    if (empty($new_iban)) {
        json_error('IBAN ist ein Pflichtfeld.', 400);
    }
    if (!$consent) {
        json_error('Die rechtliche SEPA-Zustimmung ist zwingend erforderlich.', 400);
    }

    // Leerzeichen entfernen und uppercase
    $new_iban_clean = strtoupper(str_replace(' ', '', $new_iban));
    $new_bic_clean  = strtoupper(str_replace(' ', '', $new_bic));

    if (!validate_iban($new_iban_clean)) {
        json_error('Ungueltige IBAN. Bitte pruefe das Format (z.B. DE89 3704 0044 0532 0130 00).', 400);
    }

    try {
        $db->beginTransaction();

        // 1. Altes aktives Mandat finden und widerrufen (revoked)
        $oldMandateStmt = $db->prepare("SELECT sepa_mandate_id FROM members WHERE id = ?");
        $oldMandateStmt->execute([$member_id]);
        $old_mandate_id = $oldMandateStmt->fetchColumn();

        if ($old_mandate_id) {
            $db->prepare("UPDATE sepa_mandates SET status = 'revoked', revoked_at = NOW() WHERE id = ?")
               ->execute([$old_mandate_id]);
        }

        // 2. Neue eindeutige Mandatsreferenz generieren (z.B. NICE-MEM123-202603A1B2)
        $mandate_ref = 'NICE-MEM' . $member_id . '-' . date('Ym') . strtoupper(bin2hex(random_bytes(2)));
        
        // IBAN sicher verschluesseln
        $encrypted_iban = encrypt_iban($new_iban_clean);

        // 3. Komplett NEUES Mandat in die Datenbank schreiben
        $insertStmt = $db->prepare(
            "INSERT INTO sepa_mandates 
             (member_id, mandate_reference, iban_encrypted, bic, signed_at, status, created_at) 
             VALUES (?, ?, ?, ?, NOW(), 'active', NOW())"
        );
        $insertStmt->execute([
            $member_id, 
            $mandate_ref, 
            $encrypted_iban, 
            $new_bic_clean
        ]);
        $new_mandate_id = $db->lastInsertId();

        // 4. Member updaten (Neue Mandats-ID verknüpfen + Klartext-IBAN fuer die Maske)
        $db->prepare(
            "UPDATE members SET iban = ?, sepa_mandate_id = ? WHERE id = ?"
        )->execute([$new_iban_clean, $new_mandate_id, $member_id]);

        // 5. DSGVO-konformes Audit-Log (Mit Hinweis auf Mandatswechsel)
        log_audit_sepa('SEPA_MANDATE_CREATED', (string) $member_id, [
            'mandate_reference'   => $mandate_ref,
            'iban_masked'         => mask_iban($new_iban_clean),
            'old_mandate_revoked' => $old_mandate_id ? true : false,
        ]);

        $db->commit();

        json_success([
            'success'     => true,
            'message'     => 'Neues SEPA-Mandat erfolgreich erteilt.',
            'mandate_ref' => $mandate_ref,
            'iban_masked' => mask_iban($new_iban_clean),
        ]);

    } catch (\Exception $e) {
        $db->rollBack();
        json_error('Mandat konnte nicht gespeichert werden: ' . $e->getMessage(), 500);
    }
}


// ── Fallback ─────────────────────────────────────────────────────────────────
json_error('Ungueltige Anfrage.', 400);
<?php
/**
 * api/admin/finances.php – GoBD-konformes Rechnungswesen inkl. Snapshots
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  ?type=invoices              → Alle Rechnungen (mit member_name + snapshot)
 * GET  ?type=transactions          → Zahlungstransaktionen & SEPA-Einzüge
 * GET  ?type=mandates              → Alle SEPA-Lastschrift-Mandate
 * GET  ?type=inkasso               → Offene Inkasso-Fälle & Mahnungen
 * POST ?action=create              → Rechnung erstellen (dyn. Nummer + Snapshot)
 * POST ?action=storno&id=X         → Stornieren (GoBD, Suffix aus Settings)
 * POST ?action=pay&id=X            → Als bezahlt markieren
 * POST ?action=dunning_run         → Mahnlauf ausführen (§ 286 BGB)
 * POST ?action=create_mandate      → SEPA-Mandat erstellen
 * POST ?action=revoke_mandate      → SEPA-Mandat widerrufen
 * POST ?action=escalate_inkasso    → Rechnung ans Inkasso übergeben
 * POST ?action=update_inkasso&id=X → Inkasso-Status aktualisieren
 *
 * Tabellen-Voraussetzungen:
 *   invoices       (id, invoice_number, member_id, amount, due_date, status, dunning_level, snapshot, created_at)
 *   transactions   (id, member_id, mandate_id, invoice_id, amount, type, status, reference, processed_at)
 *   sepa_mandates  (id, member_id, mandate_reference, iban_encrypted, bic, account_holder, status)
 *   inkasso_cases  (id, invoice_id, member_id, amount, dunning_level, status, external_ref, notes, escalated_at)
 *   settings       (key VARCHAR PK, value TEXT)
 *   audit_logs     (user_id, action, entity_type, entity_id, details JSON)
 *   members        (id, first_name, last_name, iban, sepa_mandate_id)
 */
declare(strict_types=1);
require_once '../config.php';

$admin  = require_auth();
if ($admin['role'] !== 'admin') json_error('Nicht autorisiert', 403);

$method = $_SERVER['REQUEST_METHOD'];
$type   = $_GET['type']   ?? null;
$action = $_GET['action'] ?? null;
$id     = $_GET['id']     ?? null;
$db     = db();

// ── Helper: Aktuelle Settings als Key/Value-Map laden ────────────────────────
function get_current_settings(): array {
    $stmt     = db()->query("SELECT `key`, `value` FROM settings");
    $settings = [];
    foreach ($stmt->fetchAll() as $row) {
        $settings[$row['key']] = $row['value'];
    }
    return $settings;
}

// Audit-Logging: Nutzt den zentralen audit_log() Helper aus config.php.
// Alle Schreiboperationen werden mit UUID, IP, User-Agent und Session-ID geloggt.

// ── Helper: IBAN maskieren ───────────────────────────────────────────────────
function mask_iban_admin(string $iban): string
{
    $clean = str_replace(' ', '', $iban);
    $len   = strlen($clean);
    if ($len < 6) return '****';
    $prefix = substr($clean, 0, 4);
    $suffix = substr($clean, -2);
    $middle = str_repeat('*', $len - 6);
    $full   = $prefix . $middle . $suffix;
    return trim(chunk_split($full, 4, ' '));
}

// ── AES-Schluessel ───────────────────────────────────────────────────────────
if (!defined('SEPA_AES_KEY')) {
    define('SEPA_AES_KEY', 'nac_sepa_secret_key_change_in_production_2026');
}

function encrypt_iban_admin(string $iban): string
{
    $iv = openssl_random_pseudo_bytes(16);
    $encrypted = openssl_encrypt(
        str_replace(' ', '', $iban),
        'AES-256-CBC',
        SEPA_AES_KEY,
        0,
        $iv
    );
    return base64_encode($iv . '::' . $encrypted);
}

// ── GET ?type=invoices ────────────────────────────────────────────────────────
if ($method === 'GET' && $type === 'invoices') {
    try {
        $stmt = $db->query(
            "SELECT i.*, m.first_name, m.last_name
             FROM invoices i
             LEFT JOIN members m ON i.member_id = m.id
             ORDER BY i.created_at DESC"
        );

        $formatted = array_map(function (array $row): array {
            return [
                'id'             => $row['id'],
                'invoice_number' => $row['invoice_number'] ?? $row['id'],
                'member_id'      => $row['member_id'],
                'member_name'    => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'amount'         => (float) $row['amount'],
                'due_date'       => $row['due_date'],
                'status'         => $row['status'],
                'dunning_level'  => (int) $row['dunning_level'],
                'created_at'     => $row['created_at'],
                'snapshot'       => isset($row['snapshot'])
                    ? json_decode($row['snapshot'], true)
                    : null,
            ];
        }, $stmt->fetchAll());

        json_success($formatted);

    } catch (\Exception $e) {
        json_error('Datenbankfehler: ' . $e->getMessage(), 500);
    }
}

// ── GET ?type=transactions – Zahlungstransaktionen laden ─────────────────────
if ($method === 'GET' && $type === 'transactions') {
    try {
        $stmt = $db->query(
            "SELECT t.*, m.first_name, m.last_name,
                    sm.mandate_reference
             FROM transactions t
             LEFT JOIN members m ON t.member_id = m.id
             LEFT JOIN sepa_mandates sm ON t.mandate_id = sm.id
             ORDER BY t.created_at DESC
             LIMIT 500"
        );

        $formatted = array_map(function (array $row): array {
            return [
                'id'                => (int) $row['id'],
                'member_id'         => (int) $row['member_id'],
                'member_name'       => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'mandate_id'        => $row['mandate_id'] ? (int) $row['mandate_id'] : null,
                'mandate_reference' => $row['mandate_reference'] ?? null,
                'invoice_id'        => $row['invoice_id'],
                'amount'            => (float) $row['amount'],
                'type'              => $row['type'],
                'status'            => $row['status'],
                'reference'         => $row['reference'],
                'failure_reason'    => $row['failure_reason'],
                'processed_at'      => $row['processed_at'],
                'created_at'        => $row['created_at'],
            ];
        }, $stmt->fetchAll());

        json_success($formatted);

    } catch (\Exception $e) {
        json_error('Fehler beim Laden der Transaktionen: ' . $e->getMessage(), 500);
    }
}

// ── GET ?type=mandates – Alle SEPA-Mandate laden ─────────────────────────────
if ($method === 'GET' && $type === 'mandates') {
    try {
        $stmt = $db->query(
            "SELECT sm.*, m.first_name, m.last_name, m.iban
             FROM sepa_mandates sm
             LEFT JOIN members m ON sm.member_id = m.id
             ORDER BY sm.created_at DESC"
        );

        $formatted = array_map(function (array $row): array {
            // Letzte & naechste Einzugsdaten berechnen
            $last_collection = null;
            $next_collection = null;

            if ($row['status'] === 'active') {
                $next_month = new \DateTime('first day of next month');
                $next_collection = $next_month->format('Y-m-d');

                // Letzte Transaktion suchen
                $txStmt = db()->prepare(
                    "SELECT processed_at FROM transactions
                     WHERE mandate_id = ? AND status = 'success'
                     ORDER BY processed_at DESC LIMIT 1"
                );
                $txStmt->execute([$row['id']]);
                $txRow = $txStmt->fetch();
                if ($txRow) {
                    $last_collection = $txRow['processed_at'];
                }
            }

            return [
                'id'                    => (int) $row['id'],
                'member_id'             => (string) $row['member_id'],
                'member_name'           => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'iban_masked'           => $row['iban'] ? mask_iban_admin($row['iban']) : '****',
                'bic'                   => $row['bic'] ?? null,
                'account_holder'        => $row['account_holder'] ?? '',
                'mandate_reference'     => $row['mandate_reference'],
                'signed_at'             => $row['signed_at'],
                'status'                => $row['status'],
                'revoked_at'            => $row['revoked_at'],
                'last_collection_date'  => $last_collection,
                'next_collection_date'  => $next_collection,
                'created_at'            => $row['created_at'],
            ];
        }, $stmt->fetchAll());

        json_success($formatted);

    } catch (\Exception $e) {
        json_error('Fehler beim Laden der SEPA-Mandate: ' . $e->getMessage(), 500);
    }
}

// ── GET ?type=inkasso – Alle Inkasso-Faelle laden ────────────────────────────
if ($method === 'GET' && $type === 'inkasso') {
    try {
        $stmt = $db->query(
            "SELECT ic.*, m.first_name, m.last_name,
                    i.invoice_number, i.dunning_level AS inv_dunning_level
             FROM inkasso_cases ic
             LEFT JOIN members m ON ic.member_id = m.id
             LEFT JOIN invoices i ON ic.invoice_id = i.id
             ORDER BY ic.escalated_at DESC"
        );

        $formatted = array_map(function (array $row): array {
            return [
                'id'              => $row['id'],
                'invoice_id'      => $row['invoice_id'],
                'invoice_number'  => $row['invoice_number'] ?? $row['invoice_id'],
                'member_id'       => (string) $row['member_id'],
                'member_name'     => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'amount'          => (float) $row['amount'],
                'dunning_level'   => (int) ($row['dunning_level'] ?? $row['inv_dunning_level'] ?? 3),
                'escalated_at'    => $row['escalated_at'],
                'status'          => $row['status'],
                'external_ref'    => $row['external_ref'] ?? null,
                'notes'           => $row['notes'] ?? null,
            ];
        }, $stmt->fetchAll());

        json_success($formatted);

    } catch (\Exception $e) {
        json_error('Fehler beim Laden der Inkasso-Faelle: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=create ───────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'create') {
    $body = get_body();

    if (empty($body['member_id']) || empty($body['amount']) || empty($body['due_date'])) {
        json_error('member_id, amount und due_date sind Pflichtfelder', 400);
    }

    try {
        $settings = get_current_settings();

        // ── Dynamische Rechnungsnummer ────────────────────────────────────────
        // Format-Vorlage aus Settings (Standard: RE-YYMMDD-###)
        $format = $settings['invoice_number_format'] ?? 'RE-ymd-###';

        // Datums-Platzhalter ersetzen (Y=2025, y=25, m=07, d=15)
        $datePart = str_replace(
            ['Y', 'y', 'm', 'd'],
            [date('Y'), date('y'), date('m'), date('d')],
            $format
        );

        // Laufende Nummer des Tages (###) berechnen
        $countStmt = $db->prepare(
            "SELECT COUNT(*) FROM invoices WHERE DATE(created_at) = CURDATE()"
        );
        $countStmt->execute();
        $dailyCount   = (int) $countStmt->fetchColumn() + 1;
        $paddedCount  = str_pad((string) $dailyCount, 3, '0', STR_PAD_LEFT);

        // ### durch laufende Nummer ersetzen; falls kein ### im Format, anhängen
        $invoiceNumber = (strpos($datePart, '###') !== false)
            ? str_replace('###', $paddedCount, $datePart)
            : $datePart . '-' . $paddedCount;

        // ── Settings-Snapshot einfrieren (GoBD: Historisierung!) ─────────────
        // Adresse aus Einzelfeldern zusammensetzen (Fallback: altes Feld)
        $street = $settings['company_street'] ?? '';
        $zip    = $settings['company_zip']    ?? '';
        $city   = $settings['company_city']   ?? '';
        $composedAddress = ($street !== '' && ($zip !== '' || $city !== ''))
            ? trim($street . ', ' . trim($zip . ' ' . $city))
            : ($settings['company_address'] ?? 'Robert-Bosch-Str. 5, 73037 Göppingen');

        // Registergericht aus Einzelfeldern (Fallback: altes Feld)
        $court = $settings['company_court'] ?? '';
        $hrb   = $settings['company_hrb']   ?? '';
        $composedCourt = ($court !== '' || $hrb !== '')
            ? trim($court . ' ' . $hrb)
            : ($settings['court_info'] ?? 'Amtsgericht Ulm HRB 737370');

        // Bankverbindung aus Einzelfeldern (Fallback: altes Feld)
        $iban     = $settings['bank_iban']  ?? '';
        $bic      = $settings['bank_bic']   ?? '';
        $bankName = $settings['bank_name']  ?? '';
        $composedBank = ($iban !== '')
            ? trim('IBAN ' . $iban . ($bic !== '' ? ' · BIC ' . $bic : '') . ($bankName !== '' ? ' · ' . $bankName : ''))
            : ($settings['bank_details'] ?? 'IBAN DE89 3704 0044 0532 0130 00 · BIC COBADEFFXXX · Commerzbank AG');

        $snapshot = json_encode([
            // Einzelfelder (für neue Rechnungs-Templates)
            'company_name'    => $settings['company_name']   ?? 'MK Fitness & Strength GmbH',
            'company_street'  => $street ?: 'Robert-Bosch-Str. 5',
            'company_zip'     => $zip    ?: '73037',
            'company_city'    => $city   ?: 'Göppingen',
            'company_court'   => $court  ?: 'Amtsgericht Ulm',
            'company_hrb'     => $hrb    ?: 'HRB 737370',
            'bank_iban'       => $iban   ?: 'DE89 3704 0044 0532 0130 00',
            'bank_bic'        => $bic    ?: 'COBADEFFXXX',
            'bank_name'       => $bankName ?: 'Commerzbank AG',
            // Zusammengesetzte Felder (Abwärtskompatibilität mit bestehenden Rechnungen)
            'company_address' => $composedAddress,
            'court_info'      => $composedCourt,
            'bank_details'    => $composedBank,
            // Weitere Pflichtfelder
            'company_email'   => $settings['company_email']  ?? 'info@nice-fitness.de',
            'vat_id'          => $settings['vat_id']         ?? 'DE123456789',
            'ceo'             => $settings['ceo']            ?? 'Wilhelm Walter',
            'vat_rate'        => $settings['vat_rate']       ?? '19',
            'logo_url'        => $settings['logo_url']       ?? null,
            'storno_suffix'   => $settings['storno_suffix']  ?? '-STO',
        ], JSON_UNESCAPED_UNICODE);

        $invId = 'INV-' . uniqid('', true);

        $db->prepare(
            "INSERT INTO invoices (id, invoice_number, member_id, amount, due_date, status, dunning_level, snapshot)
             VALUES (?, ?, ?, ?, ?, 'open', 0, ?)"
        )->execute([
            $invId,
            $invoiceNumber,
            (int) $body['member_id'],
            (float) $body['amount'],
            $body['due_date'],
            $snapshot,
        ]);

        audit_log($admin, 'CREATE_INVOICE', 'invoice', $invId, [
            'invoice_number' => $invoiceNumber,
            'amount'         => (float) $body['amount'],
            'member_id'      => $body['member_id'],
        ]);

        json_success(['id' => $invId, 'invoice_number' => $invoiceNumber]);

    } catch (\Exception $e) {
        json_error('Rechnung konnte nicht erstellt werden: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=storno&id=X ──────────────────────────────────────────────────
if ($method === 'POST' && $action === 'storno' && $id) {
    $body   = get_body();
    $reason = trim($body['reason'] ?? '');

    if ($reason === '') {
        json_error('Ein Stornogrund ist gem. GoBD Pflicht', 400);
    }

    try {
        $settings = get_current_settings();
        $suffix   = $settings['storno_suffix'] ?? '-STO';

        // Status auf cancelled setzen + Suffix an Rechnungsnummer anhängen
        $db->prepare(
            "UPDATE invoices
             SET status = 'cancelled',
                 invoice_number = CONCAT(invoice_number, ?)
             WHERE id = ? AND status != 'cancelled'"
        )->execute([$suffix, $id]);

        audit_log($admin, 'STORNO_INVOICE', 'invoice', $id, ['reason' => $reason, 'suffix' => $suffix], 'warning');
        json_success(['success' => true]);

    } catch (\Exception $e) {
        json_error('Storno fehlgeschlagen: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=pay&id=X ─────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'pay' && $id) {
    try {
        $db->prepare(
            "UPDATE invoices SET status = 'paid' WHERE id = ? AND status != 'cancelled'"
        )->execute([$id]);

        audit_log($admin, 'PAY_INVOICE', 'invoice', $id, ['note' => 'Als bezahlt markiert']);
        json_success(['success' => true]);

    } catch (\Exception $e) {
        json_error('Zahlung konnte nicht verbucht werden: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=dunning_run ──────────────────────────────────────────────────
if ($method === 'POST' && $action === 'dunning_run') {
    $today = date('Y-m-d');

    try {
        // 1. Alle offenen & überfälligen Rechnungen mit Mahnstufe < 3 laden
        $stmt = $db->prepare(
            "SELECT id, dunning_level FROM invoices
             WHERE status IN ('open','overdue') AND due_date < ? AND dunning_level < 3"
        );
        $stmt->execute([$today]);
        $overdue = $stmt->fetchAll();

        $affected        = 0;
        $levelsIncreased = [];

        $upd = $db->prepare(
            "UPDATE invoices
             SET status = 'overdue', dunning_level = ?
             WHERE id = ?"
        );

        foreach ($overdue as $inv) {
            $newLevel = min(3, (int) $inv['dunning_level'] + 1);
            $upd->execute([$newLevel, $inv['id']]);
            $levelsIncreased[] = [
                'id'   => $inv['id'],
                'from' => (int) $inv['dunning_level'],
                'to'   => $newLevel,
            ];
            $affected++;
        }

        audit_log($admin, 'DUNNING_RUN', 'invoice', 'all', [
            'affected'         => $affected,
            'levels_increased' => $levelsIncreased,
        ], 'warning');

        json_success(['success' => true, 'affected' => $affected]);

    } catch (\Exception $e) {
        json_error('Mahnlauf fehlgeschlagen: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=create_mandate – SEPA-Mandat erstellen ──────────────────────
if ($method === 'POST' && $action === 'create_mandate') {
    $body = get_body();

    $member_id = $body['member_id'] ?? null;
    $iban      = trim($body['iban'] ?? '');
    $bic       = trim($body['bic'] ?? '');

    if (empty($member_id) || empty($iban)) {
        json_error('member_id und iban sind Pflichtfelder.', 400);
    }

    // IBAN grundlegend validieren
    $iban_clean = strtoupper(str_replace(' ', '', $iban));
    if (!preg_match('/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/', $iban_clean)) {
        json_error('Ungueltige IBAN.', 400);
    }

    try {
        $db->beginTransaction();

        // Pruefen ob Member existiert
        $memberStmt = $db->prepare("SELECT id, first_name, last_name FROM members WHERE id = ?");
        $memberStmt->execute([(int) $member_id]);
        $member = $memberStmt->fetch();
        if (!$member) {
            json_error('Mitglied nicht gefunden.', 404);
        }

        // Eindeutige Mandatsreferenz generieren
        $year  = date('Y');
        $count = $db->query("SELECT COUNT(*) FROM sepa_mandates WHERE YEAR(created_at) = {$year}")->fetchColumn();
        $ref   = sprintf('NAC-SEPA-%s-%03d', $year, (int) $count + 1);

        // IBAN verschluesseln
        $iban_encrypted = encrypt_iban_admin($iban_clean);
        $account_holder = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));

        $db->prepare(
            "INSERT INTO sepa_mandates (member_id, mandate_reference, iban_encrypted, bic, account_holder, signed_at, status)
             VALUES (?, ?, ?, ?, ?, CURDATE(), 'active')"
        )->execute([
            (int) $member_id,
            $ref,
            $iban_encrypted,
            $bic ?: null,
            $account_holder,
        ]);

        $mandate_id = (int) $db->lastInsertId();

        // Member mit IBAN + Mandats-FK updaten
        $db->prepare("UPDATE members SET iban = ?, sepa_mandate_id = ? WHERE id = ?")
           ->execute([$iban_clean, $mandate_id, (int) $member_id]);

        audit_log($admin, 'CREATE_SEPA_MANDATE', 'sepa_mandate', (string) $mandate_id, [
            'mandate_reference' => $ref,
            'member_id'         => $member_id,
            'iban_masked'       => mask_iban_admin($iban_clean),
        ]);

        $db->commit();

        json_success([
            'id'                => $mandate_id,
            'mandate_reference' => $ref,
        ]);

    } catch (\Exception $e) {
        $db->rollBack();
        json_error('SEPA-Mandat konnte nicht erstellt werden: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=revoke_mandate – SEPA-Mandat widerrufen ─────────────────────
if ($method === 'POST' && $action === 'revoke_mandate') {
    $body = get_body();
    $mandate_id = $body['id'] ?? null;

    if (!$mandate_id) {
        json_error('Mandats-ID ist ein Pflichtfeld.', 400);
    }

    try {
        $db->beginTransaction();

        // Mandat widerrufen
        $stmt = $db->prepare(
            "UPDATE sepa_mandates SET status = 'revoked', revoked_at = NOW()
             WHERE id = ? AND status = 'active'"
        );
        $stmt->execute([(int) $mandate_id]);

        if ($stmt->rowCount() === 0) {
            $db->rollBack();
            json_error('Mandat nicht gefunden oder bereits widerrufen.', 404);
        }

        // FK in members-Tabelle aufheben
        $db->prepare(
            "UPDATE members SET sepa_mandate_id = NULL WHERE sepa_mandate_id = ?"
        )->execute([(int) $mandate_id]);

        audit_log($admin, 'REVOKE_SEPA_MANDATE', 'sepa_mandate', (string) $mandate_id, [
            'note' => 'Mandat widerrufen',
        ], 'warning');

        $db->commit();
        json_success(['success' => true]);

    } catch (\Exception $e) {
        $db->rollBack();
        json_error('Mandat konnte nicht widerrufen werden: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=escalate_inkasso – Rechnung ans Inkasso uebergeben ──────────
if ($method === 'POST' && $action === 'escalate_inkasso') {
    $body      = get_body();
    $invoiceId = $body['invoice_id'] ?? null;

    if (!$invoiceId) {
        json_error('invoice_id ist ein Pflichtfeld.', 400);
    }

    try {
        // Rechnung laden
        $invStmt = $db->prepare(
            "SELECT i.*, m.first_name, m.last_name, m.id AS mid
             FROM invoices i
             LEFT JOIN members m ON i.member_id = m.id
             WHERE i.id = ?"
        );
        $invStmt->execute([$invoiceId]);
        $inv = $invStmt->fetch();

        if (!$inv) {
            json_error('Rechnung nicht gefunden.', 404);
        }

        // Inkasso-ID generieren
        $count = $db->query("SELECT COUNT(*) FROM inkasso_cases")->fetchColumn();
        $inkId = sprintf('INK-%03d', (int) $count + 1);

        $db->prepare(
            "INSERT INTO inkasso_cases (id, invoice_id, member_id, amount, dunning_level, status, notes)
             VALUES (?, ?, ?, ?, ?, 'offen', ?)"
        )->execute([
            $inkId,
            $invoiceId,
            (int) $inv['member_id'],
            (float) $inv['amount'],
            (int) ($inv['dunning_level'] ?? 3),
            'Automatisch eskaliert aus Mahnlauf.',
        ]);

        // Rechnungsstatus auf 'overdue' setzen falls noch nicht
        $db->prepare(
            "UPDATE invoices SET status = 'overdue', dunning_level = 3 WHERE id = ? AND status != 'cancelled'"
        )->execute([$invoiceId]);

        audit_log($admin, 'ESCALATE_INKASSO', 'inkasso', $inkId, [
            'invoice_id' => $invoiceId,
            'member'     => trim(($inv['first_name'] ?? '') . ' ' . ($inv['last_name'] ?? '')),
            'amount'     => (float) $inv['amount'],
        ], 'critical');

        json_success(['success' => true, 'inkasso_id' => $inkId]);

    } catch (\Exception $e) {
        json_error('Inkasso-Eskalation fehlgeschlagen: ' . $e->getMessage(), 500);
    }
}

// ── POST ?action=update_inkasso&id=X – Inkasso-Status aktualisieren ──────────
if ($method === 'POST' && $action === 'update_inkasso' && $id) {
    $body = get_body();

    $new_status   = $body['status']       ?? null;
    $external_ref = $body['external_ref'] ?? null;
    $notes        = $body['notes']        ?? null;

    if (!$new_status) {
        json_error('Status ist ein Pflichtfeld.', 400);
    }

    $allowed = ['offen', 'uebergeben', 'bezahlt', 'abgeschrieben'];
    if (!in_array($new_status, $allowed, true)) {
        json_error('Ungueltiger Status. Erlaubt: ' . implode(', ', $allowed), 400);
    }

    try {
        // Dynamisches Update bauen
        $fields = ['status = ?'];
        $params = [$new_status];

        if ($external_ref !== null) {
            $fields[] = 'external_ref = ?';
            $params[] = $external_ref;
        }
        if ($notes !== null) {
            $fields[] = 'notes = ?';
            $params[] = $notes;
        }

        $params[] = $id;
        $sql = "UPDATE inkasso_cases SET " . implode(', ', $fields) . " WHERE id = ?";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) {
            json_error('Inkasso-Fall nicht gefunden.', 404);
        }

        // Bei Status "bezahlt": zugehoerige Rechnung ebenfalls als bezahlt markieren
        if ($new_status === 'bezahlt') {
            $inkStmt = $db->prepare("SELECT invoice_id FROM inkasso_cases WHERE id = ?");
            $inkStmt->execute([$id]);
            $ink = $inkStmt->fetch();
            if ($ink && $ink['invoice_id']) {
                $db->prepare(
                    "UPDATE invoices SET status = 'paid' WHERE id = ? AND status != 'cancelled'"
                )->execute([$ink['invoice_id']]);
            }
        }

        audit_log($admin, 'UPDATE_INKASSO', 'inkasso', $id, [
            'new_status'   => $new_status,
            'external_ref' => $external_ref,
            'notes'        => $notes,
        ]);

        json_success(['success' => true]);

    } catch (\Exception $e) {
        json_error('Inkasso-Update fehlgeschlagen: ' . $e->getMessage(), 500);
    }
}

json_error('Ungueltige Anfrage', 400);
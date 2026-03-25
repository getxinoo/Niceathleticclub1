<?php
/**
 * api/member/contracts.php
 * Self-Service für Pausen, Kündigungen und Paket-Upgrades.
 */
declare(strict_types=1);
require_once '../config.php';

$user = require_auth();
if (!$user['member_id']) json_error('Nur für Mitglieder', 403);
$member_id = (int)$user['member_id'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$db     = db();

if ($method === 'POST') {
    $body = get_body();

    // 1. Paket-Upgrade
    if ($action === 'upgrade') {
        $new_plan = $body['plan'] ?? null;
        if (!in_array($new_plan, ['performance', 'elite'], true)) {
            json_error('Ungültiges Paket');
        }

        $db->beginTransaction();

        $today = date('Y-m-d');
        $db->prepare("UPDATE members SET contract_type = ?, contract_start_date = ? WHERE id = ?")
           ->execute([$new_plan, $today, $member_id]);

        // Audit-Log (rechtlich bindend!)
        $db->prepare(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'CONTRACT_UPGRADE', 'member', ?, ?)"
        )->execute([
            $user['sub'],
            $member_id,
            json_encode(['new_plan' => $new_plan, 'date' => $today, 'agb_accepted' => true]),
        ]);

        $db->commit();
        json_success(['success' => true, 'new_plan' => $new_plan]);
    }

    // 2. Pause beantragen
    if ($action === 'pause') {
        // Prüfe ob schon 3 Anträge in diesem Jahr existieren
        $year  = date('Y');
        $check = $db->prepare(
            "SELECT COUNT(*) FROM member_pauses
             WHERE member_id = ? AND YEAR(created_at) = ? AND status != 'rejected'"
        );
        $check->execute([$member_id, $year]);
        if ((int)$check->fetchColumn() >= 3) {
            json_error('Du hast in diesem Jahr bereits die maximale Anzahl an Pausen (3) beantragt.');
        }

        $db->prepare(
            "INSERT INTO member_pauses
             (member_id, start_date, end_date, reason, reason_details, document_url)
             VALUES (?, ?, ?, ?, ?, ?)"
        )->execute([
            $member_id,
            $body['start_date'],
            $body['end_date'],
            $body['reason'],
            $body['reason_details'] ?? null,
            $body['document_url']   ?? null,
        ]);

        json_success(['success' => true]);
    }

    // 3. Kündigung einreichen
    if ($action === 'terminate') {
        $db->prepare(
            "INSERT INTO member_terminations
             (member_id, requested_date, reason, reason_details, document_url)
             VALUES (?, ?, ?, ?, ?)"
        )->execute([
            $member_id,
            $body['requested_date'] ?? date('Y-m-d'),
            $body['reason'],
            $body['reason_details'] ?? $body['note'] ?? null,
            $body['document_url']   ?? null,
        ]);

        json_success(['success' => true]);
    }
}

// 4. Eigene Daten abrufen (GET)
if ($method === 'GET') {
    $invStmt = $db->prepare(
        "SELECT * FROM invoices WHERE member_id = ? ORDER BY due_date DESC"
    );
    $invStmt->execute([$member_id]);

    $pauseStmt = $db->prepare(
        "SELECT * FROM member_pauses WHERE member_id = ? ORDER BY created_at DESC"
    );
    $pauseStmt->execute([$member_id]);

    json_success([
        'invoices' => $invStmt->fetchAll(),
        'pauses'   => $pauseStmt->fetchAll(),
    ]);
}

json_error('Ungültige Anfrage', 400);

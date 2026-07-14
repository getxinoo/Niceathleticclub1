<?php
/**
 * api/admin/convert_lead.php – Lead-zu-Mitglied Prozess
 */
declare(strict_types=1);
require_once '../config.php';

// ── Authorization (P1 Security-Hotfix): benötigt leads.write UND members.write ─
// Zuvor nur require_auth() → jedes Mitglied konnte Leads zu Mitgliedern
// konvertieren (neue members-/users-Datensätze anlegen).
$admin = require_auth();
require_permission('leads.write');
require_permission('members.write');
$body = get_body();

if (!$body['leadId'] || !$body['plan']) json_error('Daten unvollständig.');

// Transaktion starten
$db = db();
$db->beginTransaction();

try {
    // 1. Lead-Daten holen
    $stmt = $db->prepare("SELECT * FROM leads WHERE id = ?");
    $stmt->execute([$body['leadId']]);
    $lead = $stmt->fetch();

    // 2. Neues Mitglied anlegen
    $stmtM = $db->prepare("INSERT INTO members (first_name, last_name, email, plan, member_since, active, check_in_code) VALUES (?, ?, ?, ?, ?, 1, ?)");
    $names = explode(' ', $lead['name'], 2);
    $stmtM->execute([
        $names[0], 
        $names[1] ?? '', 
        $lead['email'], 
        $body['plan'], 
        $body['startDate'] ?? date('Y-m-d'),
        bin2hex(random_bytes(8)) // Zufälliger Check-In Code
    ]);
    $memberId = $db->lastInsertId();

    // 3. Lead-Status aktualisieren
    $db->prepare("UPDATE leads SET status = 'Bestätigt' WHERE id = ?")->execute([$body['leadId']]);

    // 4. Audit Log
    $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'CONVERT_LEAD', 'member', ?)")
       ->execute([$admin['id'], $memberId]);

    $db->commit();
    json_success(['id' => $memberId], 201);
} catch (Exception $e) {
    $db->rollBack();
    json_error($e->getMessage());
}
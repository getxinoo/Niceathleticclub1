<?php
/**
 * api/admin/requests.php
 * Admin-Backend für Urlaubsanträge, Atteste, Kündigungen & manuelle Eingaben.
 */
declare(strict_types=1);
require_once '../config.php';

$admin = require_auth();
if ($admin['role'] !== 'admin') json_error('Nicht autorisiert', 403);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$id = $_GET['id'] ?? null;
$db = db();

if ($method === 'GET') {
    $stmtP = $db->query("SELECT p.*, m.first_name, m.last_name, m.email FROM member_pauses p JOIN members m ON p.member_id = m.id ORDER BY p.created_at DESC");
    $stmtT = $db->query("SELECT t.*, m.first_name, m.last_name, m.email FROM member_terminations t JOIN members m ON t.member_id = m.id ORDER BY t.created_at DESC");

    json_success([
        'pauses' => $stmtP->fetchAll(),
        'terminations' => $stmtT->fetchAll()
    ]);
}

if ($method === 'POST') {
    $body = get_body();
    
    // Pause bearbeiten
    if ($action === 'update_pause' && $id) {
        $status = $body['status'] ?? 'rejected';
        $db->prepare("UPDATE member_pauses SET status = ? WHERE id = ?")->execute([$status, $id]);
        log_audit('UPDATE_PAUSE', 'member_pause', $id, ['status' => $status]);
        json_success(['success' => true]);
    }
    
    // Kündigung bearbeiten (inkl. Zieldatum)
    if ($action === 'update_termination' && $id) {
        $status = $body['status'] ?? 'processed';
        $effective_date = $body['effective_date'] ?? null;
        
        $db->prepare("UPDATE member_terminations SET status = ?, effective_date = ? WHERE id = ?")
           ->execute([$status, $effective_date, $id]);
           
        log_audit('UPDATE_TERMINATION', 'member_termination', $id, ['status' => $status, 'effective_date' => $effective_date]);
        json_success(['success' => true]);
    }

    // MANUELLE ANLAGE DURCH ADMIN
    if ($action === 'create_manual') {
        $type = $body['type']; // 'pause' oder 'termination'
        $member_id = (int)$body['member_id'];
        
        if ($type === 'pause') {
            $stmt = $db->prepare("INSERT INTO member_pauses (member_id, start_date, end_date, reason, reason_details, status) VALUES (?, ?, ?, ?, ?, 'approved')");
            $stmt->execute([$member_id, $body['start_date'], $body['end_date'], $body['reason'], $body['reason_details'] ?? 'Manuell am Tresen erfasst']);
        } else {
            $stmt = $db->prepare("INSERT INTO member_terminations (member_id, requested_date, effective_date, reason, reason_details, status) VALUES (?, ?, ?, ?, ?, 'processed')");
            $stmt->execute([$member_id, $body['requested_date'] ?? date('Y-m-d'), $body['effective_date'], $body['reason'], $body['reason_details'] ?? 'Manuell am Tresen erfasst']);
        }
        log_audit('MANUAL_REQUEST_CREATED', 'member', $member_id, ['type' => $type]);
        json_success(['success' => true]);
    }
}

json_error('Ungültige Anfrage', 400);

function log_audit($action, $type, $id, $details = []) {
    global $admin;
    $stmt = db()->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$admin['id'], $action, $type, $id, json_encode($details)]);
}
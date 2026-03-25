<?php
/**
 * member/bookings.php – Meine gebuchten Kurse
 */
declare(strict_types=1);
require_once '../config.php';

$user = require_auth();
if (empty($user['member_id'])) json_error('Nur für Mitglieder', 403);
$member_id = (int)$user['member_id'];
$db = db();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($method === 'GET') {
    $stmt = $db->prepare("
        SELECT b.id, b.status, c.id AS course_id, c.title, c.instructor, c.weekday, c.time, c.category
        FROM bookings b JOIN courses c ON c.id = b.course_id
        WHERE b.member_id = ? ORDER BY b.created_at DESC
    ");
    $stmt->execute([$member_id]);
    
    $result = array_map(function($r) {
        $date = date('Y-m-d', strtotime('next ' . $r['weekday']));
        return [
            'id' => (string)$r['id'],
            'sessionId' => 'sess_' . $r['course_id'],
            'title' => $r['title'],
            'instructor' => $r['instructor'],
            'startsAt' => $date . 'T' . $r['time'] . ':00',
            'durationMin' => 60,
            'status' => $r['status']
        ];
    }, $stmt->fetchAll());
    json_success($result);
}

if ($method === 'DELETE' && $id) {
    $db->beginTransaction();
    $stmt = $db->prepare("SELECT course_id FROM bookings WHERE id = ? AND member_id = ? AND status = 'confirmed'");
    $stmt->execute([$id, $member_id]);
    $booking = $stmt->fetch();
    
    if ($booking) {
        $db->prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?")->execute([$id]);
        $db->prepare("UPDATE courses SET enrolled = enrolled - 1 WHERE id = ?")->execute([$booking['course_id']]);
        
        $stmtA = $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'CANCEL_COURSE_BOOKING', 'course', ?)");
        $stmtA->execute([$user['id'], $booking['course_id']]);
    }
    $db->commit();
    http_response_code(204); exit();
}

json_error('Methode nicht erlaubt', 405);
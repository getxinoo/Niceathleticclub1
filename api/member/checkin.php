<?php
/**
 * member/checkin.php – Studio Check-In
 */
declare(strict_types=1);
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Methode nicht erlaubt.', 405);

$user = require_auth();
if (!$user['member_id']) json_error('Nur für Mitglieder', 403);
$member_id = (int)$user['member_id'];
$db = db();

// Rate-Limit
$stmt = $db->prepare("SELECT COUNT(*) FROM member_checkins WHERE member_id = ? AND checked_in_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)");
$stmt->execute([$member_id]);
if ((int)$stmt->fetchColumn() > 0) json_error('Du hast dich innerhalb der letzten 2 Stunden bereits eingecheckt.', 429);

$db->prepare('INSERT INTO member_checkins (member_id, checked_in_at) VALUES (?, NOW())')->execute([$member_id]);

json_success([
    'success' => true,
    'timestamp' => date('Y-m-d\TH:i:s'),
    'message' => 'Check-in erfolgreich! Viel Spaß beim Training.'
]);
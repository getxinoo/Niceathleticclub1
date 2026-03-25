<?php
/**
 * member/book.php – Kurs buchen
 */
declare(strict_types=1);
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Methode nicht erlaubt.', 405);

$user = require_auth();
if (!$user['member_id']) json_error('Nur für Mitglieder', 403);
$member_id = (int)$user['member_id'];
$db = db();

$body = get_body();
if (empty($body['id'])) json_error('"id" fehlt im Request-Body.');

$course_id = (int)str_replace('sess_', '', $body['id']);

$db->beginTransaction();

// Prüfen ob Platz frei ist (Sperrt Zeile für andere parallele Anfragen)
$stmt = $db->prepare("SELECT capacity, enrolled, active FROM courses WHERE id = ? FOR UPDATE");
$stmt->execute([$course_id]);
$course = $stmt->fetch();

if (!$course || !$course['active']) json_error('Kurs nicht gefunden oder inaktiv.', 404);
if ($course['enrolled'] >= $course['capacity']) json_error('Kurs ist leider voll.', 400);

// Doppelte Buchung verhindern
$stmt2 = $db->prepare("SELECT id FROM bookings WHERE member_id = ? AND course_id = ? AND status != 'cancelled'");
$stmt2->execute([$member_id, $course_id]);
if ($stmt2->fetch()) json_error('Du hast diesen Kurs bereits gebucht.', 409);

// Buchen
$db->prepare("INSERT INTO bookings (member_id, course_id, status) VALUES (?, ?, 'confirmed')")->execute([$member_id, $course_id]);
$db->prepare("UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?")->execute([$course_id]);

// Audit Log
$stmtA = $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'BOOK_COURSE', 'course', ?)");
$stmtA->execute([$user['id'], $course_id]);

$db->commit();
json_success(['success' => true]);
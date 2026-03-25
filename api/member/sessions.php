<?php
/**
 * member/sessions.php – Kommende buchbare Kurs-Sessions
 */
declare(strict_types=1);
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_error('Methode nicht erlaubt.', 405);

$user = require_auth();
if (!$user['member_id']) json_error('Nur für Mitglieder', 403);
$member_id = (int)$user['member_id'];
$db = db();

$weekday_map = ['Montag'=>1, 'Dienstag'=>2, 'Mittwoch'=>3, 'Donnerstag'=>4, 'Freitag'=>5, 'Samstag'=>6, 'Sonntag'=>0];

$stmt = $db->query('SELECT * FROM courses WHERE active = 1 ORDER BY id ASC');
$courses = $stmt->fetchAll();

// Bereits gebuchte Kurs-IDs des Mitglieds (aktive Buchungen)
$stmt2 = $db->prepare("SELECT course_id FROM bookings WHERE member_id = ? AND status IN ('confirmed','attended')");
$stmt2->execute([$member_id]);
$booked_ids = array_column($stmt2->fetchAll(), 'course_id');
$booked_set = array_flip($booked_ids);

$sessions = [];
$now = new DateTime();

foreach ($courses as $course) {
    $target_dow = $weekday_map[$course['weekday']] ?? null;
    if ($target_dow === null) continue;

    $next = clone $now;
    $current_dow = (int) $next->format('w');

    if ($current_dow === $target_dow) {
        [$h, $m] = explode(':', $course['time']);
        $course_time = (clone $next)->setTime((int)$h, (int)$m, 0);
        if ($course_time <= $now) $next->modify('+7 days');
    } else {
        $diff = ($target_dow - $current_dow + 7) % 7;
        $next->modify("+{$diff} days");
    }

    [$h, $m] = explode(':', $course['time']);
    $next->setTime((int)$h, (int)$m, 0);

    $sessions[] = [
        'id' => 'sess_' . $course['id'],
        'course_id' => $course['id'],
        'title' => $course['title'],
        'category' => $course['category'],
        'instructor' => $course['instructor'],
        'startsAt' => $next->format('Y-m-d\TH:i:s'),
        'durationMin' => 60,
        'location' => 'Main Floor',
        'spotsTotal' => (int)$course['capacity'],
        'spotsBooked' => (int)$course['enrolled'],
        'remainingSpots' => max(0, $course['capacity'] - $course['enrolled']),
        'booked' => isset($booked_set[$course['id']]),
    ];
}

usort($sessions, fn($a, $b) => strcmp($a['startsAt'], $b['startsAt']));
json_success(array_slice($sessions, 0, 20));
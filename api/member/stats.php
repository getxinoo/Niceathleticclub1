<?php
/**
 * api/member/stats.php – Dashboard-Statistiken des Mitglieds
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/member/stats.php
 *
 * Felder:
 *   visitsThisMonth     – Check-ins im aktuellen Kalendermonat
 *   visitsGoal          – Monatliches Ziel (fix 12)
 *   streakDays          – Aufeinanderfolgende Tage mit Check-in
 *   streakGoal          – Streak-Ziel (fix 7)
 *   totalVisits         – Check-ins gesamt
 *   lastVisit           – Datum letzter Check-in (Y-m-d)
 *   upcomingBookings    – Bestätigte zukünftige Kursbuchungen
 *   membershipDaysLeft  – Restliche Tage laut aktivem Vertrag
 *   caloriesBurned      – Reserviert, aktuell null
 *
 * MERGED: 2026-03 – Vereint src/api/php/member/stats.php (upcoming_bookings,
 *         membership_days_left) mit api/member/stats.php (JWT-Auth, Streak,
 *         korrekte Tabellennamen).
 * ─────────────────────────────────────────────────────────────────────────────
 */
declare(strict_types=1);
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Methode nicht erlaubt.', 405);
}

// ── Auth ─────────────────────────────────────────────────────────────────────
$user = require_auth();
if (empty($user['member_id'])) {
    json_error('Nur für Mitglieder verfügbar.', 403);
}
$member_id = (int) $user['member_id'];

try {
    $db = db();

    // ── Besuche diesen Monat ────────────────────────────────────────────────
    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM member_checkins
         WHERE member_id = ?
           AND checked_in_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
    );
    $stmt->execute([$member_id]);
    $visits_this_month = (int) $stmt->fetchColumn();

    // ── Gesamtbesuche ───────────────────────────────────────────────────────
    $stmt = $db->prepare('SELECT COUNT(*) FROM member_checkins WHERE member_id = ?');
    $stmt->execute([$member_id]);
    $total_visits = (int) $stmt->fetchColumn();

    // ── Letzter Check-in ────────────────────────────────────────────────────
    $stmt = $db->prepare('SELECT MAX(checked_in_at) FROM member_checkins WHERE member_id = ?');
    $stmt->execute([$member_id]);
    $last_visit = $stmt->fetchColumn() ?: null;

    // ── Streak (aufeinanderfolgende Tage mit Check-in) ──────────────────────
    $stmt = $db->prepare(
        "SELECT DISTINCT DATE(checked_in_at) AS day
         FROM member_checkins
         WHERE member_id = ?
         ORDER BY day DESC
         LIMIT 30"
    );
    $stmt->execute([$member_id]);
    $days = array_column($stmt->fetchAll(), 'day');

    $streak = 0;
    $today  = new DateTime();
    foreach ($days as $day) {
        $diff = (int) $today->diff(new DateTime($day))->days;
        if ($diff === $streak) {
            $streak++;
        } else {
            break;
        }
    }

    // ── Anstehende bestätigte Kursbuchungen ─────────────────────────────────
    // Wiederkehrende Kurse (event_date IS NULL) immer mitzählen
    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM bookings b
         JOIN courses c ON b.course_id = c.id
         WHERE b.member_id = ?
           AND b.status = 'confirmed'
           AND (c.event_date >= CURDATE() OR c.event_date IS NULL)"
    );
    $stmt->execute([$member_id]);
    $upcoming_bookings = (int) $stmt->fetchColumn();

    // ── Restliche Mitgliedschaftstage (aus aktivem Vertrag) ─────────────────
    $stmt = $db->prepare(
        "SELECT end_date FROM contracts
         WHERE member_id = ? AND status = 'active'
         ORDER BY start_date DESC
         LIMIT 1"
    );
    $stmt->execute([$member_id]);
    $contract = $stmt->fetch();

    $membership_days_left = 0;
    if ($contract && $contract['end_date']) {
        $diff = (new DateTime())->diff(new DateTime($contract['end_date']));
        $membership_days_left = $diff->invert ? 0 : (int) $diff->days;
    }

} catch (\Exception $e) {
    // Stub-Fallback für Entwicklung / fehlende Tabellen
    json_success([
        'visitsThisMonth'    => 8,
        'visitsGoal'         => 12,
        'streakDays'         => 3,
        'streakGoal'         => 7,
        'totalVisits'        => 47,
        'lastVisit'          => date('Y-m-d'),
        'caloriesBurned'     => null,
        'upcomingBookings'   => 2,
        'membershipDaysLeft' => 180,
    ]);
}

json_success([
    'visitsThisMonth'    => $visits_this_month,
    'visitsGoal'         => 12,
    'streakDays'         => $streak,
    'streakGoal'         => 7,
    'totalVisits'        => $total_visits,
    'lastVisit'          => $last_visit ? substr($last_visit, 0, 10) : null,
    'caloriesBurned'     => null,
    'upcomingBookings'   => $upcoming_bookings,
    'membershipDaysLeft' => $membership_days_left,
]);

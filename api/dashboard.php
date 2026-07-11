<?php
/**
 * dashboard.php – Admin-Dashboard Statistiken
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/dashboard.php → Aggregierte KPI-Daten für das Dashboard
 */

declare(strict_types=1);
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Methode nicht erlaubt.', 405);
}

// ── Authorization (P1 Security-Hotfix) ───────────────────────────────────────
// Zuvor war dieses Endpoint komplett offen (Business-KPIs ohne Anmeldung).
// Jetzt: nur authentifizierte Staff mit dashboard.view (Member erhält 403).
require_permission('dashboard.view');

$pdo = db();

// ── Neue Leads (letzte 7 Tage) ────────────────────────────────────────────────
$stmt = $pdo->query(
    "SELECT COUNT(*) FROM leads
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
);
$new_leads_7d = (int) $stmt->fetchColumn();

// ── Neue Leads (vorherige 7 Tage → für Delta-Berechnung) ─────────────────────
$stmt = $pdo->query(
    "SELECT COUNT(*) FROM leads
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       AND created_at <  DATE_SUB(NOW(), INTERVAL 7 DAY)"
);
$new_leads_prev_7d = (int) $stmt->fetchColumn();

// ── Offene Anfragen ───────────────────────────────────────────────────────────
$stmt = $pdo->query("SELECT COUNT(*) FROM leads WHERE status = 'Neu'");
$open_requests = (int) $stmt->fetchColumn();

// ── Offene Anfragen Vorwoche (Delta-Berechnung) ──────────────────────────
$stmt = $pdo->query(
    "SELECT COUNT(*) FROM leads
     WHERE status = 'Neu'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
);
$open_requests_this_week = (int) $stmt->fetchColumn();

$stmt = $pdo->query(
    "SELECT COUNT(*) FROM leads
     WHERE status = 'Neu'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       AND created_at <  DATE_SUB(NOW(), INTERVAL 7 DAY)"
);
$open_requests_prev_week = (int) $stmt->fetchColumn();
$open_requests_delta = $open_requests_this_week - $open_requests_prev_week;

// ── Kurs-Auslastung (Ø aller aktiven Kurse) ──────────────────────────────────
$stmt = $pdo->query(
    "SELECT
       ROUND(AVG(CASE WHEN capacity > 0 THEN (enrolled / capacity) * 100 ELSE 0 END), 0) AS occupancy
     FROM courses
     WHERE active = 1"
);
$occupancy_row   = $stmt->fetch();
$course_occupancy = (int) ($occupancy_row['occupancy'] ?? 0);

// ── Kurs-Auslastung Vorwoche (Delta-Berechnung) ──────────────────────────
// Wir vergleichen die heutige Auslastung mit dem Snapshot von vor 7 Tagen.
// Da wir keinen historischen Snapshot haben, berechnen wir den Delta
// aus der Differenz der gebuchten Plaetze (enrolled) vs. letzte Woche.
// Fallback: Vergleich enrolled-Aenderung der letzten 7 Tage via bookings-Tabelle
$stmt = $pdo->query(
    "SELECT COUNT(*) FROM bookings
     WHERE status = 'confirmed'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
);
$bookings_this_week = (int) $stmt->fetchColumn();

$stmt = $pdo->query(
    "SELECT COUNT(*) FROM bookings
     WHERE status = 'confirmed'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       AND created_at <  DATE_SUB(NOW(), INTERVAL 7 DAY)"
);
$bookings_prev_week = (int) $stmt->fetchColumn();

// Auslastungs-Delta als Prozentpunkt-Differenz schaetzen
$total_capacity = 0;
$stmt = $pdo->query("SELECT SUM(capacity) FROM courses WHERE active = 1");
$total_capacity = max((int) $stmt->fetchColumn(), 1);
$course_occupancy_delta = (int) round(
    (($bookings_this_week - $bookings_prev_week) / $total_capacity) * 100
);

// ── Aktive Mitglieder ─────────────────────────────────────────────────────────
$stmt = $pdo->query("SELECT COUNT(*) FROM members WHERE active = 1");
$active_members = (int) $stmt->fetchColumn();

// ── Aktive Mitglieder Vormonat (Delta-Berechnung) ─────────────────────────
$stmt = $pdo->query(
    "SELECT COUNT(*) FROM members
     WHERE active = 1
       AND member_since <= DATE_SUB(NOW(), INTERVAL 1 MONTH)"
);
$active_members_prev_month = (int) $stmt->fetchColumn();

// Neue Mitglieder = Differenz (aktuelle aktive - die schon vor 1 Monat aktiv waren)
// Alternativ: Wie viele wurden in den letzten 30 Tagen angelegt?
$stmt = $pdo->query(
    "SELECT COUNT(*) FROM members
     WHERE active = 1
       AND member_since >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
);
$new_members_30d = (int) $stmt->fetchColumn();

$stmt = $pdo->query(
    "SELECT COUNT(*) FROM members
     WHERE active = 1
       AND member_since >= DATE_SUB(NOW(), INTERVAL 60 DAY)
       AND member_since <  DATE_SUB(NOW(), INTERVAL 30 DAY)"
);
$new_members_prev_30d = (int) $stmt->fetchColumn();
$active_members_delta = $new_members_30d - $new_members_prev_30d;

// ── Leads pro Tag (letzte 7 Tage) ────────────────────────────────────────────
$stmt = $pdo->query(
    "SELECT
       DATE_FORMAT(created_at, '%Y-%m-%d') AS `date`,
       COUNT(*) AS `count`
     FROM leads
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY DATE(created_at)
     ORDER BY `date` ASC"
);
$leads_per_day_raw = $stmt->fetchAll();

// Lücken mit 0 auffüllen (alle 7 Tage müssen vorhanden sein)
$leads_per_day = [];
for ($i = 6; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-{$i} days"));
    $leads_per_day[] = [
        'date'  => $date,
        'count' => 0,
    ];
}
foreach ($leads_per_day_raw as $row) {
    foreach ($leads_per_day as &$day) {
        if ($day['date'] === $row['date']) {
            $day['count'] = (int) $row['count'];
        }
    }
    unset($day);
}

// ── Response ──────────────────────────────────────────────────────────────────
json_success([
    'newLeads7d'            => $new_leads_7d,
    'newLeads7dDelta'       => $new_leads_7d - $new_leads_prev_7d,
    'courseOccupancy'       => $course_occupancy,
    'courseOccupancyDelta'  => $course_occupancy_delta,
    'activeMembers'         => $active_members,
    'activeMembersDelta'    => $active_members_delta,
    'openRequests'          => $open_requests,
    'openRequestsDelta'     => $open_requests_delta,
    'leadsPerDay'           => $leads_per_day,
]);
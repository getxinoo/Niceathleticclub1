<?php
/**
 * admin/bookings.php – Admin Buchungsverwaltung
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/admin/bookings.php          → Alle Buchungen (mit Kurs- & Member-Details)
 * PATCH  /api/admin/bookings.php?id=1     → Status einer Buchung aendern
 * DELETE /api/admin/bookings.php?id=1     → Buchung loeschen
 *
 * Alle Endpunkte erfordern Admin/Staff-Auth.
 *
 * PATCH Payload:
 * { "status": "confirmed" | "attended" | "cancelled" | "no-show", "notes": "..." }
 */

declare(strict_types=1);
require_once '../config.php';

$user   = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        list_bookings();
        break;

    case 'PATCH':
        if ($id === null) json_error('Parameter "id" fehlt.');
        update_booking($id, $user);
        break;

    case 'DELETE':
        if ($id === null) json_error('Parameter "id" fehlt.');
        delete_booking($id, $user);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Alle Buchungen auflisten ─────────────────────────────────────────
function list_bookings(): void
{
    $db = db();

    $sql = "
        SELECT
            b.id,
            b.course_id,
            b.booking_type,
            b.member_id,
            b.guest_name,
            b.guest_email,
            b.guest_phone,
            b.status,
            b.notes,
            b.created_at,
            b.updated_at,
            c.title       AS course_title,
            c.weekday     AS course_weekday,
            c.time        AS course_time,
            c.category    AS course_category,
            c.instructor  AS instructor,
            CASE
                WHEN b.booking_type = 'member' AND b.member_id IS NOT NULL
                THEN (SELECT CONCAT(m.first_name, ' ', m.last_name)
                      FROM members m WHERE m.id = b.member_id LIMIT 1)
                ELSE NULL
            END AS member_name
        FROM bookings b
        LEFT JOIN courses c ON c.id = b.course_id
        ORDER BY b.created_at DESC
    ";

    $stmt = $db->query($sql);
    $rows = $stmt->fetchAll();

    json_success(array_map('normalize_booking', $rows));
}

// ── Handler: Buchung aktualisieren (Status/Notes) ─────────────────────────────
function update_booking(int $id, array $user): void
{
    $db   = db();
    $body = get_body();

    // Aktuelle Buchung laden
    $stmt = $db->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    $booking = $stmt->fetch();

    if (!$booking) json_error('Buchung nicht gefunden.', 404);

    $old_status = $booking['status'];
    $allowed_statuses = ['confirmed', 'attended', 'cancelled', 'no-show'];

    $sets   = [];
    $values = [];

    // Status aendern
    if (isset($body['status'])) {
        $new_status = trim($body['status']);
        if (!in_array($new_status, $allowed_statuses, true)) {
            json_error('Ungueltiger Status. Erlaubt: ' . implode(', ', $allowed_statuses));
        }
        $sets[]   = 'status = ?';
        $values[] = $new_status;
    }

    // Notes aendern
    if (array_key_exists('notes', $body)) {
        $sets[]   = 'notes = ?';
        $values[] = $body['notes'];
    }

    if (empty($sets)) {
        json_error('Keine Aenderungen uebergeben.');
    }

    $values[] = $id;
    $db->prepare('UPDATE bookings SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);

    // Bei Stornierung: enrolled runterzaehlen
    $new_status = $body['status'] ?? $old_status;
    if ($old_status === 'confirmed' && $new_status === 'cancelled') {
        $db->prepare("UPDATE courses SET enrolled = GREATEST(0, enrolled - 1) WHERE id = ?")
           ->execute([$booking['course_id']]);
    }
    // Bei Re-Aktivierung: enrolled hochzaehlen
    if ($old_status === 'cancelled' && $new_status === 'confirmed') {
        $db->prepare("UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?")
           ->execute([$booking['course_id']]);
    }

    // Audit Log
    try {
        $details = [
            'before' => ['status' => $old_status],
            'after'  => ['status' => $new_status],
        ];
        if (isset($body['notes'])) {
            $details['notes'] = $body['notes'];
        }
        $db->prepare(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'UPDATE_BOOKING_STATUS', 'booking', ?, ?)"
        )->execute([
            $user['id'] ?? $user['sub'] ?? 0,
            $id,
            json_encode($details),
        ]);
    } catch (\Exception $e) { /* Audit-Fehler ignorieren */ }

    // Aktualisierte Buchung zurueckgeben
    $stmt2 = $db->prepare("
        SELECT
            b.*,
            c.title       AS course_title,
            c.weekday     AS course_weekday,
            c.time        AS course_time,
            c.category    AS course_category,
            c.instructor  AS instructor,
            CASE
                WHEN b.booking_type = 'member' AND b.member_id IS NOT NULL
                THEN (SELECT CONCAT(m.first_name, ' ', m.last_name)
                      FROM members m WHERE m.id = b.member_id LIMIT 1)
                ELSE NULL
            END AS member_name
        FROM bookings b
        LEFT JOIN courses c ON c.id = b.course_id
        WHERE b.id = ?
    ");
    $stmt2->execute([$id]);
    $updated = $stmt2->fetch();

    json_success(normalize_booking($updated));
}

// ── Handler: Buchung loeschen ─────────────────────────────────────────────────
function delete_booking(int $id, array $user): void
{
    $db = db();

    // Buchung laden fuer Audit-Log
    $stmt = $db->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    $booking = $stmt->fetch();

    if (!$booking) json_error('Buchung nicht gefunden.', 404);

    // enrolled runterzaehlen wenn aktiv
    if ($booking['status'] === 'confirmed') {
        $db->prepare("UPDATE courses SET enrolled = GREATEST(0, enrolled - 1) WHERE id = ?")
           ->execute([$booking['course_id']]);
    }

    // Buchung loeschen
    $db->prepare("DELETE FROM bookings WHERE id = ?")->execute([$id]);

    // Audit Log
    try {
        $details = [
            'booking_type' => $booking['booking_type'],
            'course_id'    => $booking['course_id'],
        ];
        if ($booking['booking_type'] === 'guest') {
            $details['guest_name']  = $booking['guest_name'];
            $details['guest_email'] = $booking['guest_email'];
        } else {
            $details['member_id'] = $booking['member_id'];
        }
        $db->prepare(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'DELETE_BOOKING', 'booking', ?, ?)"
        )->execute([
            $user['id'] ?? $user['sub'] ?? 0,
            $id,
            json_encode($details),
        ]);
    } catch (\Exception $e) { /* noop */ }

    http_response_code(204);
    exit();
}

// ── Hilfsfunktion: DB-Zeile → API-Objekt ─────────────────────────────────────
function normalize_booking(array $r): array
{
    return [
        'id'              => (string)$r['id'],
        'course_id'       => (string)$r['course_id'],
        'course_title'    => $r['course_title'] ?? 'Unbekannter Kurs',
        'course_weekday'  => $r['course_weekday'] ?? '',
        'course_time'     => $r['course_time'] ?? '',
        'course_category' => $r['course_category'] ?? '',
        'instructor'      => $r['instructor'] ?? '',
        'booking_type'    => $r['booking_type'] ?? 'member',
        'member_id'       => isset($r['member_id']) ? (string)$r['member_id'] : null,
        'member_name'     => $r['member_name'] ?? null,
        'guest_name'      => $r['guest_name'] ?? null,
        'guest_email'     => $r['guest_email'] ?? null,
        'guest_phone'     => $r['guest_phone'] ?? null,
        'status'          => $r['status'],
        'notes'           => $r['notes'] ?? null,
        'booked_at'       => $r['created_at'],
        'updated_at'      => $r['updated_at'] ?? null,
    ];
}

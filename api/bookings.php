<?php
/**
 * bookings.php – Oeffentlicher Buchungs-Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * POST  /api/bookings.php          → Gast-Buchung erstellen (kein Auth noetig)
 * GET   /api/bookings.php          → Alle Buchungen (Auth: Admin/Staff)
 *
 * Gast-Buchung Payload:
 * {
 *   "course_id": "5",
 *   "booking_type": "guest",
 *   "name": "Sophie Klein",
 *   "email": "sophie@example.com",
 *   "phone": "+49 176 1234567"      // optional
 * }
 */

declare(strict_types=1);
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        create_guest_booking();
        break;

    case 'GET':
        // GET erfordert Auth → leitet an admin/bookings.php weiter
        // Alternativ: Hier direkt Admin-List implementieren
        $user = require_auth();
        list_all_bookings();
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Gast-Buchung erstellen ───────────────────────────────────────────
function create_guest_booking(): void
{
    $body = get_body();
    $db   = db();

    $booking_type = trim($body['booking_type'] ?? 'guest');

    // ── Gast-Buchung ──────────────────────────────────────────────────────────
    if ($booking_type === 'guest') {
        // Pflichtfelder pruefen
        $name  = trim($body['name']  ?? '');
        $email = trim($body['email'] ?? '');
        $phone = trim($body['phone'] ?? '');

        if ($name === '')  json_error('Name ist erforderlich.');
        if ($email === '') json_error('E-Mail ist erforderlich.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Ungueltige E-Mail-Adresse.');
        }

        $course_id = (int)($body['course_id'] ?? 0);
        if ($course_id <= 0) json_error('Kurs-ID fehlt.');

        $db->beginTransaction();

        try {
            // Kurs pruefen (mit Row-Lock fuer parallele Buchungen)
            $stmt = $db->prepare(
                "SELECT id, title, capacity, enrolled, active, weekday, time, category, instructor
                 FROM courses WHERE id = ? FOR UPDATE"
            );
            $stmt->execute([$course_id]);
            $course = $stmt->fetch();

            if (!$course || !$course['active']) {
                $db->rollBack();
                json_error('Kurs nicht gefunden oder inaktiv.', 404);
            }
            if ($course['enrolled'] >= $course['capacity']) {
                $db->rollBack();
                json_error('Kurs ist leider ausgebucht.', 409);
            }

            // Doppelte Gast-Buchung verhindern (gleiche E-Mail + Kurs)
            $stmt2 = $db->prepare(
                "SELECT id FROM bookings
                 WHERE guest_email = ? AND course_id = ? AND status = 'confirmed'"
            );
            $stmt2->execute([$email, $course_id]);
            if ($stmt2->fetch()) {
                $db->rollBack();
                json_error('Du hast diesen Kurs bereits gebucht.', 409);
            }

            // Buchung erstellen
            $ins = $db->prepare(
                "INSERT INTO bookings
                   (course_id, booking_type, member_id, guest_name, guest_email, guest_phone, status)
                 VALUES
                   (?, 'guest', NULL, ?, ?, ?, 'confirmed')"
            );
            $ins->execute([$course_id, $name, $email, $phone ?: null]);
            $booking_id = (int)$db->lastInsertId();

            // enrolled hochzaehlen
            $db->prepare("UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?")->execute([$course_id]);

            // Audit Log (ohne Auth – System-Eintrag)
            try {
                $db->prepare(
                    "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
                     VALUES (0, 'GUEST_BOOKING', 'booking', ?, ?)"
                )->execute([
                    $booking_id,
                    json_encode([
                        'guest_name'  => $name,
                        'guest_email' => $email,
                        'course'      => $course['title'],
                        'weekday'     => $course['weekday'],
                        'time'        => $course['time'],
                    ])
                ]);
            } catch (\Exception $e) {
                // Audit-Fehler sollen die Buchung nicht blockieren
            }

            $db->commit();

            json_success([
                'id'      => (string)$booking_id,
                'success' => true,
                'message' => 'Kurs erfolgreich gebucht!',
                'booking' => [
                    'id'           => (string)$booking_id,
                    'course_title' => $course['title'],
                    'course_time'  => $course['time'],
                    'weekday'      => $course['weekday'],
                    'guest_name'   => $name,
                    'guest_email'  => $email,
                    'status'       => 'confirmed',
                ],
            ], 201);

        } catch (\Exception $e) {
            $db->rollBack();
            json_error('Buchung fehlgeschlagen: ' . $e->getMessage(), 500);
        }
    }

    // ── Member-Buchung (mit Auth) ─────────────────────────────────────────────
    if ($booking_type === 'member') {
        // Fuer Member-Buchungen → weiterleiten an /member/book.php
        // Oder hier direkt implementieren
        $user = require_auth();
        $member_id = (int)($user['member_id'] ?? $body['member_id'] ?? 0);
        if ($member_id <= 0) json_error('Member-ID fehlt.', 400);

        $course_id = (int)($body['course_id'] ?? 0);
        if ($course_id <= 0) json_error('Kurs-ID fehlt.');

        $db->beginTransaction();

        try {
            $stmt = $db->prepare(
                "SELECT id, title, capacity, enrolled, active, weekday, time, category, instructor
                 FROM courses WHERE id = ? FOR UPDATE"
            );
            $stmt->execute([$course_id]);
            $course = $stmt->fetch();

            if (!$course || !$course['active']) {
                $db->rollBack();
                json_error('Kurs nicht gefunden oder inaktiv.', 404);
            }
            if ($course['enrolled'] >= $course['capacity']) {
                $db->rollBack();
                json_error('Kurs ist leider ausgebucht.', 409);
            }

            // Doppelte Buchung verhindern
            $stmt2 = $db->prepare(
                "SELECT id FROM bookings
                 WHERE member_id = ? AND course_id = ? AND status != 'cancelled'"
            );
            $stmt2->execute([$member_id, $course_id]);
            if ($stmt2->fetch()) {
                $db->rollBack();
                json_error('Du hast diesen Kurs bereits gebucht.', 409);
            }

            $ins = $db->prepare(
                "INSERT INTO bookings
                   (course_id, booking_type, member_id, status)
                 VALUES
                   (?, 'member', ?, 'confirmed')"
            );
            $ins->execute([$course_id, $member_id]);
            $booking_id = (int)$db->lastInsertId();

            $db->prepare("UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?")->execute([$course_id]);

            // Audit Log
            try {
                $db->prepare(
                    "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
                     VALUES (?, 'MEMBER_BOOKING', 'booking', ?, ?)"
                )->execute([
                    $user['id'],
                    $booking_id,
                    json_encode([
                        'member_id' => $member_id,
                        'course'    => $course['title'],
                        'weekday'   => $course['weekday'],
                        'time'      => $course['time'],
                    ])
                ]);
            } catch (\Exception $e) { /* noop */ }

            $db->commit();

            json_success([
                'id'      => (string)$booking_id,
                'success' => true,
                'message' => 'Kurs erfolgreich gebucht!',
            ], 201);

        } catch (\Exception $e) {
            $db->rollBack();
            json_error('Buchung fehlgeschlagen: ' . $e->getMessage(), 500);
        }
    }

    json_error('Ungueltiger booking_type. Erlaubt: "member", "guest".', 400);
}

// ── Handler: Alle Buchungen auflisten (Admin) ─────────────────────────────────
function list_all_bookings(): void
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
            c.title       AS course_title,
            c.weekday     AS course_weekday,
            c.time        AS course_time,
            c.category    AS course_category,
            c.instructor  AS instructor,
            CASE
                WHEN b.booking_type = 'member' AND b.member_id IS NOT NULL
                THEN (SELECT CONCAT(m.first_name, ' ', m.last_name) FROM members m WHERE m.id = b.member_id LIMIT 1)
                ELSE NULL
            END AS member_name
        FROM bookings b
        LEFT JOIN courses c ON c.id = b.course_id
        ORDER BY b.created_at DESC
    ";

    $stmt = $db->query($sql);
    $rows = $stmt->fetchAll();

    $result = array_map(function ($r) {
        return [
            'id'              => (string)$r['id'],
            'course_id'       => (string)$r['course_id'],
            'course_title'    => $r['course_title'] ?? 'Unbekannter Kurs',
            'course_weekday'  => $r['course_weekday'] ?? '',
            'course_time'     => $r['course_time'] ?? '',
            'course_category' => $r['course_category'] ?? '',
            'instructor'      => $r['instructor'] ?? '',
            'booking_type'    => $r['booking_type'],
            'member_id'       => $r['member_id'] ? (string)$r['member_id'] : null,
            'member_name'     => $r['member_name'],
            'guest_name'      => $r['guest_name'],
            'guest_email'     => $r['guest_email'],
            'guest_phone'     => $r['guest_phone'],
            'status'          => $r['status'],
            'notes'           => $r['notes'],
            'booked_at'       => $r['created_at'],
        ];
    }, $rows);

    json_success($result);
}

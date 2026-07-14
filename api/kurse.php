<?php
/**
 * kurse.php – Advanced Kursplan API (Serie vs. Einzel-Event)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET   /api/kurse.php          → Alle Kurse auflisten (sortiert nach Typ)
 * POST  /api/kurse.php          → Neuen Kurs anlegen (inkl. Audit-Log)
 * PATCH /api/kurse.php?id=1     → Kurs aktualisieren (inkl. Audit-Log)
 * DELETE /api/kurse.php?id=1    → Kurs löschen (inkl. Audit-Log)
 */

declare(strict_types=1);
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

/**
 * Hilfsfunktion für das Audit-Logging innerhalb der API
 */
function log_audit(string $action, $entity_id, array $details = []): void {
    try {
        $user = require_auth(); // Prüft Token und liefert User-Daten
        $userId = $user['id'] ?? $user['sub'] ?? 0;
        $stmt = db()->prepare(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES (?, ?, 'course', ?, ?)"
        );
        $stmt->execute([
            $userId, 
            $action, 
            $entity_id, 
            json_encode($details)
        ]);
    } catch (Exception $e) {
        // Audit-Fehler sollten den Hauptprozess nicht stoppen
    }
}

switch ($method) {
    case 'GET':
        $id !== null ? get_course($id) : list_courses();
        break;

    case 'POST':
        require_permission('courses.write'); // P1 Security-Hotfix: Kurs anlegen = Staff-Recht
        create_course();
        break;

    case 'PATCH':
        require_permission('courses.write'); // P1 Security-Hotfix
        if ($id === null) json_error('Parameter "id" fehlt.');
        update_course($id);
        break;

    case 'DELETE':
        require_permission('courses.write'); // P1 Security-Hotfix
        if ($id === null) json_error('Parameter "id" fehlt.');
        delete_course($id);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Liste ────────────────────────────────────────────────────────────
function list_courses(): void
{
    // JOIN mit users-Tabelle, um den vollstaendigen Trainer-Namen aufzuloesen
    $sql = "SELECT c.*, 
                   COALESCE(CONCAT(u.first_name, ' ', u.last_name), c.instructor) AS resolved_instructor
            FROM courses c
            LEFT JOIN users u ON CONCAT(u.first_name, ' ', u.last_name) = c.instructor 
                              AND u.active = 1
            ORDER BY c.is_recurring DESC, 
            FIELD(c.weekday, 'Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'), 
            c.event_date ASC, 
            c.time ASC";

    $stmt = db()->query($sql);
    $courses = $stmt->fetchAll();
    json_success(array_map('normalize_course', $courses));
}

// ── Handler: Einzelner Kurs ───────────────────────────────────────────────────
function get_course(int $id): void
{
    $stmt = db()->prepare(
        "SELECT c.*, 
                COALESCE(CONCAT(u.first_name, ' ', u.last_name), c.instructor) AS resolved_instructor
         FROM courses c
         LEFT JOIN users u ON CONCAT(u.first_name, ' ', u.last_name) = c.instructor 
                           AND u.active = 1
         WHERE c.id = ?"
    );
    $stmt->execute([$id]);
    $course = $stmt->fetch();

    if (!$course) {
        json_error('Kurs nicht gefunden.', 404);
    }

    json_success(normalize_course($course));
}

// ── Handler: Kurs anlegen ─────────────────────────────────────────────────────
function create_course(): void
{
    $body = get_body();

    // Pflichtfelder prüfen
    $required = ['title', 'category', 'instructor', 'time'];
    foreach ($required as $field) {
        if (empty(trim((string)($body[$field] ?? '')))) {
            json_error("Pflichtfeld '{$field}' fehlt.");
        }
    }

    $is_recurring = isset($body['is_recurring']) ? (bool)$body['is_recurring'] : true;
    $weekday = $is_recurring ? ($body['weekday'] ?? 'Montag') : 'Einmalig';
    $event_date = !$is_recurring ? ($body['event_date'] ?? null) : null;

    if (!$is_recurring && !$event_date) {
        json_error("Für Einzeltermine ist ein Datum (event_date) erforderlich.");
    }

    $stmt = db()->prepare(
        'INSERT INTO courses (title, category, instructor, is_recurring, weekday, event_date, time, capacity, enrolled, active, locked)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0)'
    );
    
    $stmt->execute([
        trim((string)$body['title']),
        trim((string)$body['category']),
        trim((string)$body['instructor']),
        $is_recurring ? 1 : 0,
        $weekday,
        $event_date,
        trim((string)$body['time']),
        isset($body['capacity']) ? max(1, (int)$body['capacity']) : 20
    ]);

    $new_id = (int)db()->lastInsertId();
    
    // Audit Logging
    log_audit('CREATE_COURSE', $new_id, $body);

    $stmt2 = db()->prepare('SELECT * FROM courses WHERE id = ?');
    $stmt2->execute([$new_id]);
    json_success(normalize_course($stmt2->fetch()), 201);
}

// ── Handler: Kurs aktualisieren ───────────────────────────────────────────────
function update_course(int $id): void
{
    $body = get_body();
    $allowed = ['title', 'category', 'instructor', 'is_recurring', 'weekday', 'event_date', 'time', 'capacity', 'active', 'locked'];
    $fields = [];
    $values = [];

    foreach ($allowed as $field) {
        if (!array_key_exists($field, $body)) continue;

        if ($field === 'is_recurring' || $field === 'active' || $field === 'locked') {
            $values[] = $body[$field] ? 1 : 0;
        } elseif ($field === 'capacity') {
            $values[] = max(1, (int)$body[$field]);
        } else {
            $values[] = trim((string)$body[$field]);
        }
        $fields[] = "{$field} = ?";
    }

    if (empty($fields)) {
        json_error('Keine Änderungen übergeben.');
    }

    $values[] = $id;
    $stmt = db()->prepare('UPDATE courses SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    // Audit Logging
    log_audit('UPDATE_COURSE', $id, $body);

    $stmt2 = db()->prepare('SELECT * FROM courses WHERE id = ?');
    $stmt2->execute([$id]);
    $course = $stmt2->fetch();

    if (!$course) json_error('Kurs nicht gefunden.', 404);
    json_success(normalize_course($course));
}

// ── Handler: Kurs löschen ─────────────────────────────────────────────────────
function delete_course(int $id): void
{
    // Vor dem Löschen Daten für das Log sichern
    $stmt_check = db()->prepare('SELECT title FROM courses WHERE id = ?');
    $stmt_check->execute([$id]);
    $course = $stmt_check->fetch();

    if (!$course) json_error('Kurs nicht gefunden.', 404);

    $stmt = db()->prepare('DELETE FROM courses WHERE id = ?');
    $stmt->execute([$id]);

    // Audit Logging
    log_audit('DELETE_COURSE', $id, ['title' => $course['title']]);

    http_response_code(204);
    exit();
}

// ── Hilfsfunktion: DB-Zeile → API-Objekt ─────────────────────────────────────
function normalize_course(array $c): array
{
    return [
        'id'           => (string)$c['id'],
        'title'        => $c['title'],
        'category'     => $c['category'],
        'instructor'   => $c['resolved_instructor'] ?? $c['instructor'],
        'is_recurring' => (bool)($c['is_recurring'] ?? true),
        'weekday'      => $c['weekday'],
        'event_date'   => $c['event_date'] ?? null,
        'time'         => $c['time'],
        'capacity'     => (int)$c['capacity'],
        'enrolled'     => (int)($c['enrolled'] ?? 0),
        'active'       => (bool)$c['active'],
        'locked'       => (bool)($c['locked'] ?? false),
    ];
}
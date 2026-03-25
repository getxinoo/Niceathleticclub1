<?php
/**
 * karriere.php – Karriere / HR API
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC:
 *   GET  /api/karriere.php                   → Aktive Jobs + Benefits
 *   POST /api/karriere.php?action=apply      → Bewerbung einreichen
 *
 * ADMIN (Auth required):
 *   GET  /api/karriere.php?admin=1           → Alle Jobs + Benefits + Applicants
 *   POST /api/karriere.php?action=save_job   → Job anlegen/updaten
 *   DELETE /api/karriere.php?job_id=X        → Job löschen
 *   POST /api/karriere.php?action=save_benefit → Benefit anlegen/updaten
 *   DELETE /api/karriere.php?benefit_id=X    → Benefit löschen
 *   PATCH /api/karriere.php?applicant_id=X   → Bewerber-Status updaten
 *   DELETE /api/karriere.php?applicant_id=X  → Bewerber löschen
 *
 * SHIFTS:
 *   GET  /api/karriere.php?action=shifts&week=2026-03-09  → Schichten einer Woche
 *   POST /api/karriere.php?action=save_shift              → Schicht anlegen/updaten
 *   DELETE /api/karriere.php?shift_id=X                   → Schicht löschen
 *   POST /api/karriere.php?action=swap_request            → Tauschanfrage stellen
 *   PATCH /api/karriere.php?swap_id=X                     → Tauschanfrage genehmigen/ablehnen
 */

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/config.php';

$method     = $_SERVER['REQUEST_METHOD'];
$action     = $_GET['action']       ?? '';
$admin      = $_GET['admin']        ?? '';
$jobId      = $_GET['job_id']       ?? '';
$benefitId  = $_GET['benefit_id']   ?? '';
$applicantId= $_GET['applicant_id'] ?? '';
$shiftId    = $_GET['shift_id']     ?? '';
$swapId     = $_GET['swap_id']      ?? '';
$pdo        = db();

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function tables_exist(PDO $pdo): bool {
    try {
        $pdo->query("SELECT 1 FROM career_jobs LIMIT 1");
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

function map_job(array $r): array {
    return [
        'id'             => (int)$r['id'],
        'title'          => $r['title'],
        'department'     => $r['department'],
        'employmentType' => $r['employment_type'],
        'level'          => $r['level'],
        'location'       => $r['location'] ?? 'Göppingen, BW',
        'description'    => $r['description'],
        'tags'           => json_decode($r['tags'] ?? '[]', true) ?? [],
        'active'         => (bool)$r['active'],
        'sortOrder'      => (int)$r['sort_order'],
        'createdAt'      => $r['created_at'] ?? null,
    ];
}

function map_benefit(array $r): array {
    return [
        'id'          => (int)$r['id'],
        'icon'        => $r['icon'],
        'title'       => $r['title'],
        'description' => $r['description'],
        'sortOrder'   => (int)$r['sort_order'],
        'active'      => (bool)$r['active'],
    ];
}

function map_applicant(array $r): array {
    return [
        'id'            => (int)$r['id'],
        'jobId'         => $r['job_id'] ? (int)$r['job_id'] : null,
        'firstName'     => $r['first_name'],
        'lastName'      => $r['last_name'],
        'email'         => $r['email'],
        'phone'         => $r['phone'],
        'birthDate'     => $r['birth_date'],
        'street'        => $r['street'],
        'zip'           => $r['zip'],
        'city'          => $r['city'],
        'country'       => $r['country'],
        'locationPref'  => $r['location_pref'],
        'startDate'     => $r['start_date'],
        'noticePeriod'  => $r['notice_period'],
        'flexibilityKm' => $r['flexibility_km'] ? (int)$r['flexibility_km'] : null,
        'profession'    => $r['profession'],
        'education'     => $r['education'],
        'training'      => $r['training'],
        'source'        => $r['source'],
        'coverLetter'   => $r['cover_letter'],
        'status'        => $r['status'],
        'notes'         => $r['notes'],
        'createdAt'     => $r['created_at'],
    ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════
if ($method === 'GET') {

    if (!tables_exist($pdo)) {
        json_success(['jobs' => [], 'benefits' => [], 'applicants' => [], 'shifts' => []]);
    }

    // Shifts
    if ($action === 'shifts') {
        require_auth();
        $week = $_GET['week'] ?? date('Y-m-d');
        $start = date('Y-m-d', strtotime('monday this week', strtotime($week)));
        $end   = date('Y-m-d', strtotime('sunday this week', strtotime($week)));

        $stmt = $pdo->prepare("SELECT * FROM staff_shifts WHERE shift_date BETWEEN :start AND :end ORDER BY shift_date, start_time");
        $stmt->execute([':start' => $start, ':end' => $end]);
        $shifts = $stmt->fetchAll();

        $mapped = array_map(function($s) {
            return [
                'id'        => (int)$s['id'],
                'staffId'   => $s['staff_id'],
                'staffName' => $s['staff_name'],
                'date'      => $s['shift_date'],
                'startTime' => substr($s['start_time'], 0, 5),
                'endTime'   => substr($s['end_time'], 0, 5),
                'role'      => $s['role'],
                'notes'     => $s['notes'],
                'status'    => $s['status'],
            ];
        }, $shifts);

        json_success($mapped);
    }

    // Admin: all data
    $isAdmin = false;
    if ($admin === '1') {
        require_admin();
        $isAdmin = true;
    }

    $jobWhere    = $isAdmin ? '' : 'WHERE active = 1';
    $benefitWhere= $isAdmin ? '' : 'WHERE active = 1';

    $jobs = $pdo->query("SELECT * FROM career_jobs {$jobWhere} ORDER BY sort_order ASC")->fetchAll();
    $benefits = $pdo->query("SELECT * FROM career_benefits {$benefitWhere} ORDER BY sort_order ASC")->fetchAll();

    $result = [
        'jobs'     => array_map('map_job', $jobs),
        'benefits' => array_map('map_benefit', $benefits),
    ];

    if ($isAdmin) {
        $applicants = $pdo->query("SELECT * FROM career_applicants ORDER BY created_at DESC")->fetchAll();
        $result['applicants'] = array_map('map_applicant', $applicants);
    }

    json_success($result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST
// ═══════════════════════════════════════════════════════════════════════════════
if ($method === 'POST') {
    $body = get_body();

    // Public: Bewerbung einreichen
    if ($action === 'apply') {
        if (empty($body['firstName']) || empty($body['lastName']) || empty($body['email'])) {
            json_error('Vorname, Nachname und E-Mail sind Pflichtfelder.', 422);
        }

        // ── Duplikat-Schutz: Gleiche E-Mail + Job innerhalb 30 Tagen ──────
        $dup_email = strtolower(trim((string) $body['email']));
        $dup_job   = $body['jobId'] ?? null;
        $stmt_dup  = $pdo->prepare(
            "SELECT id FROM career_applicants
             WHERE email = ? AND (job_id = ? OR (? IS NULL AND job_id IS NULL))
               AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
        );
        $stmt_dup->execute([$dup_email, $dup_job, $dup_job]);
        if ($stmt_dup->fetch()) {
            json_success([
                'message' => 'Deine Bewerbung ist bereits eingegangen. Wir melden uns bei dir!',
                'duplicate' => true,
            ], 200);
        }

        $stmt = $pdo->prepare("
            INSERT INTO career_applicants
                (job_id, first_name, last_name, email, phone, birth_date, street, zip, city, country,
                 location_pref, start_date, notice_period, flexibility_km, profession, education, training, source, cover_letter)
            VALUES
                (:job_id, :fn, :ln, :email, :phone, :bd, :street, :zip, :city, :country,
                 :loc, :start, :notice, :flex, :prof, :edu, :train, :src, :cover)
        ");
        $stmt->execute([
            ':job_id'  => $body['jobId'] ?? null,
            ':fn'      => $body['firstName'],
            ':ln'      => $body['lastName'],
            ':email'   => $body['email'],
            ':phone'   => $body['phone'] ?? null,
            ':bd'      => $body['birthDate'] ?? null,
            ':street'  => $body['street'] ?? null,
            ':zip'     => $body['zip'] ?? null,
            ':city'    => $body['city'] ?? null,
            ':country' => $body['country'] ?? 'Deutschland',
            ':loc'     => $body['locationPref'] ?? null,
            ':start'   => $body['startDate'] ?? null,
            ':notice'  => $body['noticePeriod'] ?? null,
            ':flex'    => $body['flexibilityKm'] ?? 50,
            ':prof'    => $body['profession'] ?? null,
            ':edu'     => $body['education'] ?? null,
            ':train'   => $body['training'] ?? null,
            ':src'     => $body['source'] ?? null,
            ':cover'   => $body['coverLetter'] ?? null,
        ]);

        json_success(['message' => 'Bewerbung erfolgreich eingereicht!', 'id' => (int)$pdo->lastInsertId()], 201);
    }

    require_admin();

    // save_job
    if ($action === 'save_job') {
        $stmt = $pdo->prepare("
            INSERT INTO career_jobs (id, title, department, employment_type, level, location, description, tags, sort_order, active)
            VALUES (:id, :title, :dept, :type, :level, :loc, :desc, :tags, :sort, :active)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title), department = VALUES(department), employment_type = VALUES(employment_type),
                level = VALUES(level), location = VALUES(location), description = VALUES(description),
                tags = VALUES(tags), sort_order = VALUES(sort_order), active = VALUES(active)
        ");
        $stmt->execute([
            ':id'     => $body['id'] ?? null,
            ':title'  => $body['title'],
            ':dept'   => $body['department'],
            ':type'   => $body['employmentType'],
            ':level'  => $body['level'] ?? 'Erfahren',
            ':loc'    => $body['location'] ?? 'Göppingen, BW',
            ':desc'   => $body['description'],
            ':tags'   => json_encode($body['tags'] ?? [], JSON_UNESCAPED_UNICODE),
            ':sort'   => $body['sortOrder'] ?? 0,
            ':active' => $body['active'] ?? 1,
        ]);
        json_success(['message' => 'Job gespeichert.', 'id' => (int)($body['id'] ?? $pdo->lastInsertId())]);
    }

    // save_benefit
    if ($action === 'save_benefit') {
        $stmt = $pdo->prepare("
            INSERT INTO career_benefits (id, icon, title, description, sort_order, active)
            VALUES (:id, :icon, :title, :desc, :sort, :active)
            ON DUPLICATE KEY UPDATE
                icon = VALUES(icon), title = VALUES(title), description = VALUES(description),
                sort_order = VALUES(sort_order), active = VALUES(active)
        ");
        $stmt->execute([
            ':id'     => $body['id'] ?? null,
            ':icon'   => $body['icon'] ?? 'Zap',
            ':title'  => $body['title'],
            ':desc'   => $body['description'],
            ':sort'   => $body['sortOrder'] ?? 0,
            ':active' => $body['active'] ?? 1,
        ]);
        json_success(['message' => 'Benefit gespeichert.']);
    }

    // save_shift
    if ($action === 'save_shift') {
        $stmt = $pdo->prepare("
            INSERT INTO staff_shifts (id, staff_id, staff_name, shift_date, start_time, end_time, role, notes, status)
            VALUES (:id, :sid, :sname, :date, :start, :end, :role, :notes, :status)
            ON DUPLICATE KEY UPDATE
                staff_id = VALUES(staff_id), staff_name = VALUES(staff_name), shift_date = VALUES(shift_date),
                start_time = VALUES(start_time), end_time = VALUES(end_time), role = VALUES(role),
                notes = VALUES(notes), status = VALUES(status)
        ");
        $stmt->execute([
            ':id'     => $body['id'] ?? null,
            ':sid'    => $body['staffId'],
            ':sname'  => $body['staffName'],
            ':date'   => $body['date'],
            ':start'  => $body['startTime'],
            ':end'    => $body['endTime'],
            ':role'   => $body['role'] ?? null,
            ':notes'  => $body['notes'] ?? null,
            ':status' => $body['status'] ?? 'geplant',
        ]);
        json_success(['message' => 'Schicht gespeichert.', 'id' => (int)($body['id'] ?? $pdo->lastInsertId())]);
    }

    // swap_request
    if ($action === 'swap_request') {
        $stmt = $pdo->prepare("
            INSERT INTO shift_swap_requests (shift_id, requester_id, requester_name, reason)
            VALUES (:shift_id, :req_id, :req_name, :reason)
        ");
        $stmt->execute([
            ':shift_id'  => $body['shiftId'],
            ':req_id'    => $body['requesterId'],
            ':req_name'  => $body['requesterName'],
            ':reason'    => $body['reason'] ?? null,
        ]);
        json_success(['message' => 'Tauschanfrage eingereicht.']);
    }

    json_error('Unbekannte Action.', 400);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH
// ═══════════════════════════════════════════════════════════════════════════════
if ($method === 'PATCH') {
    require_admin();
    $body = get_body();

    if ($applicantId) {
        $sets = [];
        $params = [':id' => $applicantId];
        foreach (['status', 'notes'] as $field) {
            if (isset($body[$field])) {
                $sets[] = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (empty($sets)) json_error('Keine Felder zum Updaten.', 422);

        $pdo->prepare("UPDATE career_applicants SET " . implode(', ', $sets) . " WHERE id = :id")->execute($params);
        json_success(['message' => 'Bewerber aktualisiert.']);
    }

    if ($swapId) {
        $pdo->prepare("UPDATE shift_swap_requests SET status = :status, reviewed_by = :by WHERE id = :id")
            ->execute([':status' => $body['status'], ':by' => $body['reviewedBy'] ?? null, ':id' => $swapId]);
        json_success(['message' => 'Tauschanfrage aktualisiert.']);
    }

    json_error('Keine ID angegeben.', 400);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════
if ($method === 'DELETE') {
    require_admin();

    if ($jobId) {
        $pdo->prepare("DELETE FROM career_jobs WHERE id = :id")->execute([':id' => $jobId]);
        json_success(['message' => 'Job gelöscht.']);
    }
    if ($benefitId) {
        $pdo->prepare("DELETE FROM career_benefits WHERE id = :id")->execute([':id' => $benefitId]);
        json_success(['message' => 'Benefit gelöscht.']);
    }
    if ($applicantId) {
        $pdo->prepare("DELETE FROM career_applicants WHERE id = :id")->execute([':id' => $applicantId]);
        json_success(['message' => 'Bewerber gelöscht.']);
    }
    if ($shiftId) {
        $pdo->prepare("DELETE FROM staff_shifts WHERE id = :id")->execute([':id' => $shiftId]);
        json_success(['message' => 'Schicht gelöscht.']);
    }

    json_error('Keine ID angegeben.', 400);
}

json_error('Methode nicht unterstützt.', 405);
<?php
/**
 * absences.php – Abwesenheits-API
 * ─────────────────────────────────────────────────────────────────────────────
 * Echte DB-Struktur (staff_absences):
 *   id, user_id (INT UNSIGNED), type (enum), start_date, end_date,
 *   reason, status (enum), approved_by (varchar 50), approved_at,
 *   created_at, updated_at
 *   → KEIN staff_name/staff_id – Name per JOIN aus users-Tabelle
 *
 * GET  /api/absences.php                     → Alle Abwesenheiten
 * GET  /api/absences.php?action=budgets      → Urlaubsbudgets
 * GET  /api/absences.php?action=swap_offers  → Offene Tausch-Angebote
 * POST /api/absences.php?action=request      → Abwesenheit beantragen
 * PATCH /api/absences.php?id=X               → Genehmigen/Ablehnen
 * DELETE /api/absences.php?id=X              → Löschen
 */

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = $_GET['id']     ?? '';
$pdo    = db();

/**
 * Prüft ob eine bestimmte Tabelle existiert.
 */
function table_exists(PDO $pdo, string $table): bool {
    try { $pdo->query("SELECT 1 FROM `{$table}` LIMIT 1"); return true; }
    catch (PDOException $e) { return false; }
}

/**
 * Mappt eine DB-Row (mit JOIN-Feldern) auf das Frontend-Format.
 */
function map_absence(array $r): array {
    // staff_name kommt aus dem JOIN: CONCAT(u.first_name, ' ', u.last_name)
    return [
        'id'         => (int)$r['id'],
        'staffId'    => (string)($r['user_id'] ?? ''),
        'staffName'  => $r['staff_name'] ?? '',
        'type'       => $r['type'],
        'startDate'  => $r['start_date'],
        'endDate'    => $r['end_date'],
        'reason'     => $r['reason'] ?? '',
        'status'     => $r['status'],
        'approvedBy' => $r['approved_by'] ?? null,
        'createdAt'  => $r['created_at'],
    ];
}

// ═══ GET ═══
if ($method === 'GET') {

    // ── Urlaubsbudgets ───────────────────────────────────────────────────────
    if ($action === 'budgets') {
        require_auth();
        if (!table_exists($pdo, 'staff_vacation_budget')) {
            json_success([]);
        }
        try {
            $sql = "SELECT b.*, b.user_id,
                           COALESCE(CONCAT(u.first_name, ' ', u.last_name), '') AS staff_name
                    FROM staff_vacation_budget b
                    LEFT JOIN users u ON u.id = b.user_id
                    ORDER BY b.user_id";
            $rows = $pdo->query($sql)->fetchAll();
            $out = array_map(function($r) {
                return [
                    'staffId'    => (string)$r['user_id'],
                    'staffName'  => $r['staff_name'] ?? '',
                    'totalDays'  => (int)$r['total_days'],
                    'usedDays'   => (int)$r['used_days'],
                    'carryOver'  => (int)$r['carry_over'],
                ];
            }, $rows);
            json_success($out);
        } catch (PDOException $e) {
            json_success([]);
        }
    }

    // ── Tausch-Angebote ──────────────────────────────────────────────────────
    if ($action === 'swap_offers') {
        require_auth();
        if (!table_exists($pdo, 'staff_shifts') || !table_exists($pdo, 'shift_swap_requests')) {
            json_success([]);
        }
        try {
            $rows = $pdo->query("
                SELECT s.*, sw.id as swap_id, sw.requester_id, sw.requester_name, sw.reason as swap_reason
                FROM staff_shifts s
                JOIN shift_swap_requests sw ON sw.shift_id = s.id
                WHERE s.status = 'tausch_offen' AND sw.status = 'offen'
                ORDER BY s.shift_date
            ")->fetchAll();
            $out = array_map(function($r) {
                return [
                    'id'        => (int)$r['swap_id'],
                    'shiftId'   => (int)$r['id'],
                    'staffId'   => $r['staff_id'],
                    'staffName' => $r['staff_name'],
                    'date'      => $r['shift_date'],
                    'startTime' => substr($r['start_time'], 0, 5),
                    'endTime'   => substr($r['end_time'], 0, 5),
                    'role'      => $r['role'] ?? '',
                    'reason'    => $r['swap_reason'] ?? '',
                    'status'    => 'offen',
                ];
            }, $rows);
            json_success($out);
        } catch (PDOException $e) {
            json_success([]);
        }
    }

    // ── Alle Abwesenheiten (Default) ─────────────────────────────────────────
    if (!table_exists($pdo, 'staff_absences')) {
        json_success([]);
    }
    try {
        // JOIN mit users um staff_name zu bekommen (existiert nicht in staff_absences)
        $sql = "SELECT a.*,
                       COALESCE(CONCAT(u.first_name, ' ', u.last_name), CONCAT('User #', a.user_id)) AS staff_name
                FROM staff_absences a
                LEFT JOIN users u ON u.id = a.user_id
                ORDER BY a.created_at DESC";
        $rows = $pdo->query($sql)->fetchAll();
        json_success(array_map('map_absence', $rows));
    } catch (PDOException $e) {
        json_success([]);
    }
}

// ═══ POST ═══
if ($method === 'POST') {
    require_auth();
    if (!table_exists($pdo, 'staff_absences')) {
        json_error('Tabelle staff_absences existiert nicht. Bitte SQL-Setup ausführen.', 500);
    }
    $body = get_body();

    if ($action === 'request') {
        // Frontend sendet staffId (String) → DB erwartet user_id (INT)
        $userId = (int)($body['staffId'] ?? $body['userId'] ?? 0);
        if ($userId === 0) {
            json_error('staffId / userId ist erforderlich.', 422);
        }

        $stmt = $pdo->prepare("
            INSERT INTO staff_absences (user_id, type, start_date, end_date, reason, status)
            VALUES (:uid, :type, :start, :end, :reason, :status)
        ");
        $stmt->execute([
            ':uid'    => $userId,
            ':type'   => $body['type'] ?? 'urlaub',
            ':start'  => $body['startDate'],
            ':end'    => $body['endDate'],
            ':reason' => $body['reason'] ?? null,
            ':status' => $body['status'] ?? 'beantragt',
        ]);
        json_success(['message' => 'Abwesenheit beantragt.', 'id' => (int)$pdo->lastInsertId()], 201);
    }

    json_error('Unbekannte Action.', 400);
}

// ═══ PATCH ═══
if ($method === 'PATCH') {
    require_admin();
    if (!$id) json_error('Keine ID.', 400);
    if (!table_exists($pdo, 'staff_absences')) {
        json_error('Tabelle staff_absences existiert nicht.', 500);
    }
    $body = get_body();

    $sets = [];
    $params = [':id' => $id];
    if (isset($body['status'])) {
        $sets[] = 'status = :status';
        $params[':status'] = $body['status'];
    }
    if (isset($body['approvedBy'])) {
        $sets[] = 'approved_by = :approved_by';
        $sets[] = 'approved_at = NOW()';
        $params[':approved_by'] = $body['approvedBy'];
    }
    if (empty($sets)) json_error('Keine Felder.', 422);

    $pdo->prepare("UPDATE staff_absences SET " . implode(', ', $sets) . " WHERE id = :id")->execute($params);

    // Update vacation budget if approved
    if (($body['status'] ?? '') === 'genehmigt') {
        try {
            $abs = $pdo->prepare("SELECT * FROM staff_absences WHERE id = :id");
            $abs->execute([':id' => $id]);
            $row = $abs->fetch();
            if ($row && $row['type'] === 'urlaub' && table_exists($pdo, 'staff_vacation_budget')) {
                $days = (int)ceil((strtotime($row['end_date']) - strtotime($row['start_date'])) / 86400) + 1;
                $pdo->prepare("
                    UPDATE staff_vacation_budget SET used_days = used_days + :days
                    WHERE user_id = :uid AND year = YEAR(:start)
                ")->execute([':days' => $days, ':uid' => $row['user_id'], ':start' => $row['start_date']]);
            }
        } catch (PDOException $e) {
            // Budget-Update fehlgeschlagen – Absenz trotzdem genehmigt
        }
    }

    json_success(['message' => 'Abwesenheit aktualisiert.']);
}

// ═══ DELETE ═══
if ($method === 'DELETE') {
    require_admin();
    if (!$id) json_error('Keine ID.', 400);
    if (!table_exists($pdo, 'staff_absences')) {
        json_error('Tabelle staff_absences existiert nicht.', 500);
    }
    $pdo->prepare("DELETE FROM staff_absences WHERE id = :id")->execute([':id' => $id]);
    json_success(['message' => 'Abwesenheit gelöscht.']);
}

json_error('Methode nicht unterstützt.', 405);

<?php
/**
 * api/admin/tracking.php
 * Trainer-Ansicht: Ernährungs- & Coaching-Ziele setzen, Kunden-Fortschritt einsehen.
 *
 * GET  /admin/tracking.php?member_id=X
 *   → measurements[], goals (inkl. goal_type, target_weight, target_date, coaching_note),
 *     checkins[] (letzte 8 Wochen)
 *
 * POST /admin/tracking.php?action=set_goals&member_id=X
 *   Body (JSON): calories_goal, protein_goal, carbs_goal, fat_goal,
 *                goal_type, target_weight, target_date, coaching_note
 *
 * PHP 7.4-kompatibel (Checkdomain):
 *   - kein str_contains()  → strpos() !== false
 *   - kein str_starts_with() an dieser Stelle
 *   - alle DB-Ops in try/catch
 */
declare(strict_types=1);
require_once '../config.php';

$admin = require_auth();
$allowed_roles = ['admin', 'trainer', 'frontdesk'];
if (!in_array($admin['role'], $allowed_roles, true)) {
    json_error('Nicht autorisiert', 403);
}

$method    = $_SERVER['REQUEST_METHOD'];
$action    = $_GET['action']    ?? null;
$member_id = isset($_GET['member_id']) ? (int)$_GET['member_id'] : null;

if (!$member_id) json_error('Member ID fehlt', 400);

$db = db();

// ── Hilfsfunktion: Prüft ob eine Spalte existiert ────────────────────────────
// SHOW COLUMNS – MySQL 5.7-kompatibel (kein INFORMATION_SCHEMA, kein IF NOT EXISTS)
function column_exists(PDO $pdo, string $table, string $column): bool
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        return false;
    }
}

// ── GET: Trainer lädt Daten des Mitglieds ────────────────────────────────────
if ($method === 'GET') {

    // ── Body measurements ────────────────────────────────────────────────────
    $measurements = [];
    try {
        $hasWaist = column_exists($db, 'body_measurements', 'waist_cm');
        $hasHip   = column_exists($db, 'body_measurements', 'hip_cm');

        $extraCols = '';
        if ($hasWaist) $extraCols .= ', waist_cm';
        if ($hasHip)   $extraCols .= ', hip_cm';

        $stmtM = $db->prepare(
            "SELECT date, weight, body_fat, muscle_mass{$extraCols}
             FROM body_measurements
             WHERE member_id = ?
             ORDER BY date ASC"
        );
        $stmtM->execute([$member_id]);
        $measurements = $stmtM->fetchAll();
    } catch (Throwable $e) {
        error_log('[NAC tracking GET measurements] ' . $e->getMessage());
        $measurements = [];
    }

    // ── Nutrition goals ──────────────────────────────────────────────────────
    $goals = null;
    try {
        $hasGoalType     = column_exists($db, 'nutrition_goals', 'goal_type');
        $hasTargetWeight = column_exists($db, 'nutrition_goals', 'target_weight');
        $hasTargetDate   = column_exists($db, 'nutrition_goals', 'target_date');
        $hasCoachNote    = column_exists($db, 'nutrition_goals', 'coaching_note');
        $hasSetBy        = column_exists($db, 'nutrition_goals', 'set_by_user_id');

        $extraGoalCols = '';
        if ($hasGoalType)     $extraGoalCols .= ', goal_type';
        if ($hasTargetWeight) $extraGoalCols .= ', target_weight';
        if ($hasTargetDate)   $extraGoalCols .= ', target_date';
        if ($hasCoachNote)    $extraGoalCols .= ', coaching_note';
        if ($hasSetBy)        $extraGoalCols .= ', set_by_user_id';

        $stmtG = $db->prepare(
            "SELECT calories_goal, protein_goal, carbs_goal, fat_goal{$extraGoalCols}
             FROM nutrition_goals WHERE member_id = ?"
        );
        $stmtG->execute([$member_id]);
        $goals = $stmtG->fetch() ?: null;

        $migrationDone = $hasGoalType && $hasTargetWeight && $hasTargetDate && $hasCoachNote && $hasSetBy;

        if ($goals) {
            $goals['goal_type']      = $goals['goal_type']      ?? 'maintain';
            $goals['target_weight']  = $goals['target_weight']  ?? null;
            $goals['target_date']    = $goals['target_date']    ?? null;
            $goals['coaching_note']  = $goals['coaching_note']  ?? null;
            $goals['set_by_user_id'] = $goals['set_by_user_id'] ?? null;
            $goals['set_by_trainer'] = !empty($goals['set_by_user_id']);
            $goals['_migration_v2']  = $migrationDone;
        } else {
            $goals = [
                'calories_goal'  => 2000,
                'protein_goal'   => 120,
                'carbs_goal'     => 200,
                'fat_goal'       => 70,
                'goal_type'      => 'maintain',
                'target_weight'  => null,
                'target_date'    => null,
                'coaching_note'  => null,
                'set_by_user_id' => null,
                'set_by_trainer' => false,
                '_migration_v2'  => $migrationDone,
            ];
        }
    } catch (Throwable $e) {
        error_log('[NAC tracking GET goals] ' . $e->getMessage());
        $goals = [
            'calories_goal'  => 2000,
            'protein_goal'   => 120,
            'carbs_goal'     => 200,
            'fat_goal'       => 70,
            'goal_type'      => 'maintain',
            'target_weight'  => null,
            'target_date'    => null,
            'coaching_note'  => null,
            'set_by_user_id' => null,
            'set_by_trainer' => false,
            '_migration_v2'  => false,
        ];
    }

    // ── Check-in frequency per week (last 8 weeks) ───────────────────────────
    $checkins = [];
    try {
        $stmtC = $db->prepare(
            "SELECT
                DATE_FORMAT(DATE_SUB(checkin_time, INTERVAL WEEKDAY(checkin_time) DAY), '%Y-%m-%d') AS week_start,
                COUNT(*) AS count
             FROM member_checkins
             WHERE member_id = ?
               AND checkin_time >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
             GROUP BY week_start
             ORDER BY week_start ASC"
        );
        $stmtC->execute([$member_id]);
        $rawCheckins = $stmtC->fetchAll();

        $checkins = array_map(function ($row) {
            $dt = new DateTime($row['week_start']);
            return [
                'week'  => 'KW ' . $dt->format('W'),
                'count' => (int)$row['count'],
            ];
        }, $rawCheckins);
    } catch (Throwable $e) {
        error_log('[NAC tracking GET checkins] ' . $e->getMessage());
        $checkins = [];
    }

    json_success([
        'measurements' => $measurements,
        'goals'        => $goals,
        'checkins'     => $checkins,
    ]);
}

// ── POST: Trainer speichert Ziele ────────────────────────────────────────────
if ($method === 'POST' && $action === 'set_goals') {

    // Prüfe ob die v2-Migration ausgeführt wurde
    $v2Cols      = ['goal_type', 'target_weight', 'target_date', 'coaching_note', 'set_by_user_id'];
    $missingCols = [];
    foreach ($v2Cols as $col) {
        if (!column_exists($db, 'nutrition_goals', $col)) {
            $missingCols[] = $col;
        }
    }

    if (!empty($missingCols)) {
        http_response_code(503);
        echo json_encode([
            'error'        => 'Datenbank-Migration fehlt: Spalten nicht vorhanden.',
            'detail'       => 'Bitte api/migrations/tracking_v2.sql in phpMyAdmin ausfuehren (jeden ALTER TABLE Schritt einzeln).',
            'missing_cols' => $missingCols,
            'table'        => 'nutrition_goals',
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }

    // Eingaben lesen & validieren
    $body = get_body();

    $c     = (int)($body['calories_goal'] ?? 2000);
    $p     = (int)($body['protein_goal']  ?? 120);
    $carbs = (int)($body['carbs_goal']    ?? 200);
    $f     = (int)($body['fat_goal']      ?? 70);

    $goal_type = in_array($body['goal_type'] ?? '', ['cut', 'bulk', 'maintain'], true)
                 ? $body['goal_type'] : 'maintain';

    $target_weight = (isset($body['target_weight']) && $body['target_weight'] !== '' && $body['target_weight'] !== null)
                     ? (float)$body['target_weight'] : null;
    $target_date   = !empty($body['target_date'])   ? $body['target_date']         : null;
    $coaching_note = !empty($body['coaching_note']) ? trim($body['coaching_note']) : null;
    $set_by        = (int)$admin['id'];

    // Zieldatum plausibel?
    if ($target_date !== null) {
        $dtCheck = DateTime::createFromFormat('Y-m-d', $target_date);
        if (!$dtCheck) $target_date = null;
    }

    // INSERT … ON DUPLICATE KEY UPDATE
    try {
        $stmt = $db->prepare("
            INSERT INTO nutrition_goals
                (member_id, calories_goal, protein_goal, carbs_goal, fat_goal,
                 goal_type, target_weight, target_date, coaching_note, set_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                calories_goal  = VALUES(calories_goal),
                protein_goal   = VALUES(protein_goal),
                carbs_goal     = VALUES(carbs_goal),
                fat_goal       = VALUES(fat_goal),
                goal_type      = VALUES(goal_type),
                target_weight  = VALUES(target_weight),
                target_date    = VALUES(target_date),
                coaching_note  = VALUES(coaching_note),
                set_by_user_id = VALUES(set_by_user_id)
        ");
        $stmt->execute([
            $member_id, $c, $p, $carbs, $f,
            $goal_type, $target_weight, $target_date, $coaching_note, $set_by,
        ]);
    } catch (PDOException $e) {
        error_log('[NAC tracking set_goals PDO] ' . $e->getMessage());

        // PHP 7.4-kompatibel: strpos() statt str_contains()
        if (strpos($e->getMessage(), 'Unknown column') !== false) {
            json_error(
                'Datenbank-Spalte fehlt. Bitte tracking_v2.sql Migration ausfuehren. Detail: ' . $e->getMessage(),
                503
            );
        }

        json_error('Datenbankfehler beim Speichern: ' . $e->getMessage(), 500);
    }

    // Audit-Log
    try {
        audit_log(
            $admin,
            'SET_NUTRITION_GOALS',
            'member',
            $member_id,
            [
                'calories_goal' => $c,
                'protein_goal'  => $p,
                'carbs_goal'    => $carbs,
                'fat_goal'      => $f,
                'goal_type'     => $goal_type,
                'target_weight' => $target_weight,
                'target_date'   => $target_date,
            ],
            'info',
            'admin_ui'
        );
    } catch (Throwable $e) {
        error_log('[NAC tracking set_goals audit] ' . $e->getMessage());
    }

    json_success(['success' => true]);
}

json_error('Ungültige Anfrage', 400);

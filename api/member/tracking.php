<?php
/**
 * api/member/tracking.php  – Member Self-Service Tracking
 *
 * GET  → measurements[], goals (inkl. Trainer-Extensions), logs (30 Tage)
 * POST action=add_measurement  → weight, body_fat, muscle_mass, waist_cm, hip_cm, date
 * POST action=log_nutrition    → calories, protein, carbs, fat, water_ml, date
 */
declare(strict_types=1);
require_once '../config.php';

$user = require_auth();
if (empty($user['member_id'])) json_error('Nur für Mitglieder', 403);
$member_id = (int)$user['member_id'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$db     = db();

// ── GET: Alle Tracking-Daten laden ──────────────────────────────────────────
if ($method === 'GET') {

    // Body measurements (inkl. neue Spalten)
    $stmtM = $db->prepare(
        "SELECT date, weight, body_fat, muscle_mass, waist_cm, hip_cm
         FROM body_measurements
         WHERE member_id = ?
         ORDER BY date ASC"
    );
    $stmtM->execute([$member_id]);
    $measurements = $stmtM->fetchAll();

    // Goals inkl. Trainer-Extensions
    $stmtG = $db->prepare("SELECT * FROM nutrition_goals WHERE member_id = ?");
    $stmtG->execute([$member_id]);
    $goals = $stmtG->fetch();
    if ($goals) {
        $goals['set_by_trainer'] = !empty($goals['set_by_user_id']);
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
            'set_by_trainer' => false,
        ];
    }

    // Nutrition logs (letzte 30 Tage, inkl. water_ml)
    $stmtL = $db->prepare(
        "SELECT date, calories, protein, carbs, fat, water_ml
         FROM nutrition_logs
         WHERE member_id = ?
         ORDER BY date DESC
         LIMIT 30"
    );
    $stmtL->execute([$member_id]);
    $logs = $stmtL->fetchAll();

    json_success([
        'measurements' => $measurements,
        'goals'        => $goals,
        'logs'         => $logs,
    ]);
}

// ── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = get_body();

    // ── add_measurement ───────────────────────────────────────────────────────
    if ($action === 'add_measurement') {
        $date        = !empty($body['date'])        ? $body['date']                    : date('Y-m-d');
        $weight      = isset($body['weight'])       && $body['weight'] !== ''          ? (float)$body['weight']      : null;
        $body_fat    = isset($body['body_fat'])     && $body['body_fat'] !== ''        ? (float)$body['body_fat']    : null;
        $muscle_mass = isset($body['muscle_mass'])  && $body['muscle_mass'] !== ''     ? (float)$body['muscle_mass'] : null;
        $waist_cm    = isset($body['waist_cm'])     && $body['waist_cm'] !== ''        ? (float)$body['waist_cm']    : null;
        $hip_cm      = isset($body['hip_cm'])       && $body['hip_cm'] !== ''          ? (float)$body['hip_cm']      : null;

        // Prüfen ob Messung für dieses Datum schon existiert
        $stmtCheck = $db->prepare("SELECT id FROM body_measurements WHERE member_id = ? AND date = ?");
        $stmtCheck->execute([$member_id, $date]);

        if ($stmtCheck->fetch()) {
            $stmt = $db->prepare(
                "UPDATE body_measurements
                 SET weight = COALESCE(?, weight),
                     body_fat = COALESCE(?, body_fat),
                     muscle_mass = COALESCE(?, muscle_mass),
                     waist_cm = COALESCE(?, waist_cm),
                     hip_cm = COALESCE(?, hip_cm)
                 WHERE member_id = ? AND date = ?"
            );
            $stmt->execute([$weight, $body_fat, $muscle_mass, $waist_cm, $hip_cm, $member_id, $date]);
        } else {
            $stmt = $db->prepare(
                "INSERT INTO body_measurements
                    (member_id, date, weight, body_fat, muscle_mass, waist_cm, hip_cm)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([$member_id, $date, $weight, $body_fat, $muscle_mass, $waist_cm, $hip_cm]);
        }

        json_success(['success' => true]);
    }

    // ── log_nutrition ─────────────────────────────────────────────────────────
    if ($action === 'log_nutrition') {
        $date     = !empty($body['date'])     ? $body['date']      : date('Y-m-d');
        $c        = (int)($body['calories']   ?? 0);
        $p        = (int)($body['protein']    ?? 0);
        $carbs    = (int)($body['carbs']      ?? 0);
        $f        = (int)($body['fat']        ?? 0);
        $water_ml = isset($body['water_ml'])  && $body['water_ml'] !== '' ? (int)$body['water_ml'] : null;

        $stmt = $db->prepare("
            INSERT INTO nutrition_logs
                (member_id, date, calories, protein, carbs, fat, water_ml)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                calories = ?,
                protein  = ?,
                carbs    = ?,
                fat      = ?,
                water_ml = COALESCE(?, water_ml)
        ");
        $stmt->execute([$member_id, $date, $c, $p, $carbs, $f, $water_ml,
                         $c, $p, $carbs, $f, $water_ml]);

        json_success(['success' => true]);
    }
}

json_error('Ungültige Anfrage', 400);

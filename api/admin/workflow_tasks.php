<?php
/**
 * workflow_tasks.php – Pending Actions / Workflow Task Queue
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    → Liste (Filter: status, required_role, module, assigned_user_id)
 * POST   → Neuen Task erstellen
 * PATCH  → Task status ändern (approve/reject/done)
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: Tasks auflisten ─────────────────────────────────────────────────────
if ($method === 'GET') {
    $payload = require_staff();
    $role    = $payload['role'] ?? '';
    $userId  = (int)($payload['sub'] ?? 0);

    $where  = ['1=1'];
    $params = [];

    // Filter: status (default: open)
    $status = $_GET['status'] ?? 'open';
    if ($status && $status !== 'all') {
        $where[]  = 'wt.status = ?';
        $params[] = $status;
    }

    // Nicht-Admins sehen nur Tasks für ihre Rolle oder an sie zugewiesene
    if ($role !== 'admin') {
        $where[]  = '(wt.required_role = ? OR wt.assigned_user_id = ?)';
        $params[] = $role;
        $params[] = $userId;
    }

    // Filter: module
    if (!empty($_GET['module'])) {
        $where[]  = 'wt.module = ?';
        $params[] = $_GET['module'];
    }

    $sql = "SELECT wt.*,
                   u1.name AS created_by_name,
                   u2.name AS assigned_user_name
            FROM workflow_tasks wt
            LEFT JOIN users u1 ON u1.id = wt.created_by
            LEFT JOIN users u2 ON u2.id = wt.assigned_user_id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY wt.created_at DESC
            LIMIT 200";

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_success($stmt->fetchAll());
}

// ── POST: Neuen Task erstellen ───────────────────────────────────────────────
if ($method === 'POST') {
    $payload = require_staff();
    $body    = get_body();

    $required = ['module', 'entity_type', 'entity_id', 'task_type', 'required_role', 'title'];
    foreach ($required as $field) {
        if (empty($body[$field])) {
            json_error("Feld '{$field}' ist erforderlich.", 422);
        }
    }

    $stmt = db()->prepare(
        "INSERT INTO workflow_tasks
            (module, entity_type, entity_id, task_type, required_role, title, description, payload, assigned_user_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $body['module'],
        $body['entity_type'],
        $body['entity_id'],
        $body['task_type'],
        $body['required_role'],
        $body['title'],
        $body['description'] ?? null,
        isset($body['payload']) ? json_encode($body['payload']) : null,
        !empty($body['assigned_user_id']) ? (int)$body['assigned_user_id'] : null,
        (int)$payload['sub'],
    ]);

    json_success(['id' => (int)db()->lastInsertId(), 'status' => 'created'], 201);
}

// ── PATCH: Task-Status ändern ────────────────────────────────────────────────
if ($method === 'PATCH') {
    $payload = require_staff();
    $body    = get_body();

    if (empty($body['id'])) json_error('Task-ID erforderlich.', 422);

    $validStatuses = ['open', 'approved', 'rejected', 'done'];
    if (empty($body['status']) || !in_array($body['status'], $validStatuses, true)) {
        json_error('Ungültiger Status. Erlaubt: ' . implode(', ', $validStatuses), 422);
    }

    $resolvedAt = in_array($body['status'], ['approved', 'rejected', 'done'], true)
        ? date('Y-m-d H:i:s')
        : null;

    $stmt = db()->prepare(
        "UPDATE workflow_tasks SET status = ?, resolved_at = ? WHERE id = ?"
    );
    $stmt->execute([$body['status'], $resolvedAt, (int)$body['id']]);

    // Audit
    try {
        db()->prepare(
            "INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details)
             VALUES (?, ?, 'resolve_task', 'workflow_task', ?, ?)"
        )->execute([
            $payload['sub'],
            $payload['name'],
            (string)$body['id'],
            json_encode(['new_status' => $body['status']]),
        ]);
    } catch (\PDOException $e) { /* noop */ }

    json_success(['status' => 'updated']);
}

json_error('Methode nicht erlaubt.', 405);

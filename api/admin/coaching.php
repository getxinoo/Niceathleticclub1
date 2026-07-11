<?php
/**
 * /api/admin/coaching.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin Coaching Pipeline API
 * 
 * GET              → Alle Coaching-Requests laden (mit Plan-Daten + Member-Name)
 * POST ?action=assign&id=X    → Trainer zuweisen
 * POST ?action=save_plan&id=X → Plan erstellen/updaten
 * POST ?action=update_status&id=X → Status aendern
 */

require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

$pdo = db();

$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? null;

// ── Authorization (P1 Security-Hotfix) ───────────────────────────────────────
// Zuvor offen: gesamte Coaching-Pipeline ohne Anmeldung. Jetzt rollenbasiert:
// Lesen → coaching.read, Trainer zuweisen → coaching.assign, sonst coaching.write.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require_permission('coaching.read');
} elseif ($action === 'assign') {
    require_permission('coaching.assign');
} else {
    require_permission('coaching.write');
}

// ── GET: Alle Coaching-Requests laden ─────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($action)) {
    $stmt = $pdo->query("
        SELECT 
            cr.id,
            cr.member_id,
            CONCAT(m.first_name, ' ', m.last_name) AS member_name,
            cr.type,
            cr.status,
            cr.goal,
            cr.notes,
            cr.assigned_to,
            CONCAT(u.first_name, ' ', u.last_name) AS assigned_name,
            cr.created_at,
            cr.completed_at,
            cp.id AS plan_id,
            cp.title AS plan_title,
            cp.description AS plan_description,
            cp.created_at AS plan_created_at,
            CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name
        FROM coaching_requests cr
        LEFT JOIN members m ON cr.member_id = m.id
        LEFT JOIN users u ON cr.assigned_to = u.id
        LEFT JOIN coaching_plans cp ON cr.plan_id = cp.id
        LEFT JOIN users coach ON cp.coach_id = coach.id
        ORDER BY cr.created_at DESC
    ");
    
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Attach plan items
    foreach ($requests as &$req) {
        if ($req['plan_id']) {
            $itemStmt = $pdo->prepare("SELECT label, done FROM coaching_plan_items WHERE plan_id = ? ORDER BY sort_order");
            $itemStmt->execute([$req['plan_id']]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
            $req['plan_data'] = [
                'title' => $req['plan_title'],
                'description' => $req['plan_description'],
                'items' => array_map(function($i) { return ['label' => $i['label'], 'done' => (bool)$i['done']]; }, $items),
                'created_at' => $req['plan_created_at'],
                'coach_name' => $req['coach_name'],
            ];
        } else {
            $req['plan_data'] = null;
        }
        // Cleanup temp fields
        unset($req['plan_id'], $req['plan_title'], $req['plan_description'], $req['plan_created_at'], $req['coach_name']);
    }
    
    echo json_encode($requests);
    exit;
}

// ── POST: Assign Trainer ─────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'assign' && $id) {
    $input = json_decode(file_get_contents('php://input'), true);
    $staffId = $input['staff_id'] ?? null;
    
    if (!$staffId) {
        http_response_code(400);
        echo json_encode(['error' => 'staff_id fehlt']);
        exit;
    }
    
    $stmt = $pdo->prepare("UPDATE coaching_requests SET assigned_to = ?, status = 'in_progress' WHERE id = ?");
    $stmt->execute([$staffId, $id]);
    
    echo json_encode(['success' => true]);
    exit;
}

// ── POST: Save Plan ──────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save_plan' && $id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Get request to find assigned coach
    $reqStmt = $pdo->prepare("SELECT assigned_to FROM coaching_requests WHERE id = ?");
    $reqStmt->execute([$id]);
    $request = $reqStmt->fetch(PDO::FETCH_ASSOC);
    $coachId = $request['assigned_to'] ?? null;
    
    $pdo->beginTransaction();
    try {
        // Create plan
        $planStmt = $pdo->prepare("INSERT INTO coaching_plans (request_id, coach_id, title, description) VALUES (?, ?, ?, ?)");
        $planStmt->execute([$id, $coachId, $input['title'] ?? '', $input['description'] ?? '']);
        $planId = $pdo->lastInsertId();
        
        // Create items
        $items = $input['items'] ?? [];
        $itemStmt = $pdo->prepare("INSERT INTO coaching_plan_items (plan_id, label, sort_order) VALUES (?, ?, ?)");
        foreach ($items as $idx => $item) {
            $itemStmt->execute([$planId, $item['label'] ?? '', $idx]);
        }
        
        // Link plan to request
        $updateStmt = $pdo->prepare("UPDATE coaching_requests SET plan_id = ?, status = 'in_progress' WHERE id = ?");
        $updateStmt->execute([$planId, $id]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'plan_id' => $planId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ── POST: Update Status ──────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_status' && $id) {
    $input = json_decode(file_get_contents('php://input'), true);
    $status = $input['status'] ?? null;
    
    if (!in_array($status, ['open', 'in_progress', 'completed', 'cancelled'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Ungueltiger Status']);
        exit;
    }
    
    $completedAt = $status === 'completed' ? date('Y-m-d H:i:s') : null;
    $stmt = $pdo->prepare("UPDATE coaching_requests SET status = ?, completed_at = ? WHERE id = ?");
    $stmt->execute([$status, $completedAt, $id]);
    
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ungueltige Anfrage']);
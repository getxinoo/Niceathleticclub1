<?php
/**
 * /api/member/coaching.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Member Coaching API
 * 
 * GET                     → Eigene Coaching-Requests laden
 * POST ?action=request    → Neue Coaching-Anfrage stellen
 * POST ?action=toggle_item → Checklist-Item als erledigt/offen markieren
 */

require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

$pdo = db();

$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? null;

// ── Authorization (P1 Security-Hotfix): Identität NUR aus JWT/Session ─────────
// Zuvor IDOR: member_id kam aus Query/Body – jedes Mitglied konnte fremde
// Coaching-Daten lesen/ändern. Jetzt ist die member_id aus dem Token
// verbindlich; ein clientseitig gesendetes member_id wird ignoriert.
$user     = require_auth();
$memberId = isset($user['member_id']) ? (int) $user['member_id'] : 0;
if ($memberId <= 0) {
    json_error('Nur für Mitglieder.', 403);
}
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// ── GET: Eigene Requests laden ────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($action)) {
    if (!$memberId) {
        http_response_code(400);
        echo json_encode(['error' => 'member_id fehlt']);
        exit;
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            cr.id, cr.type, cr.status, cr.goal, cr.notes, cr.created_at,
            cr.assigned_to,
            CONCAT(u.first_name, ' ', u.last_name) AS assigned_name,
            cp.id AS plan_id,
            cp.title AS plan_title,
            cp.description AS plan_description,
            cp.created_at AS plan_created_at,
            CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name
        FROM coaching_requests cr
        LEFT JOIN users u ON cr.assigned_to = u.id
        LEFT JOIN coaching_plans cp ON cr.plan_id = cp.id
        LEFT JOIN users coach ON cp.coach_id = coach.id
        WHERE cr.member_id = ?
        ORDER BY cr.created_at DESC
    ");
    $stmt->execute([$memberId]);
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
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
        unset($req['plan_id'], $req['plan_title'], $req['plan_description'], $req['plan_created_at'], $req['coach_name']);
    }
    
    echo json_encode($requests);
    exit;
}

// ── POST: Neue Anfrage stellen ────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'request') {
    if (!$memberId) {
        http_response_code(400);
        echo json_encode(['error' => 'member_id fehlt']);
        exit;
    }
    
    $type = $input['type'] ?? 'training';
    $goal = $input['goal'] ?? '';
    $notes = $input['notes'] ?? null;
    
    if (empty($goal)) {
        http_response_code(400);
        echo json_encode(['error' => 'Ziel fehlt']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO coaching_requests (member_id, type, goal, notes) VALUES (?, ?, ?, ?)");
    $stmt->execute([$memberId, $type, $goal, $notes]);
    
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

// ── POST: Toggle Item ─────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'toggle_item' && $id) {
    $itemIndex = $input['item_index'] ?? null;
    if ($itemIndex === null) {
        http_response_code(400);
        echo json_encode(['error' => 'item_index fehlt']);
        exit;
    }
    
    // Get plan_id from request — scoped to the authenticated member (kein IDOR)
    $reqStmt = $pdo->prepare("SELECT plan_id FROM coaching_requests WHERE id = ? AND member_id = ?");
    $reqStmt->execute([$id, $memberId]);
    $request = $reqStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$request || !$request['plan_id']) {
        http_response_code(404);
        echo json_encode(['error' => 'Plan nicht gefunden']);
        exit;
    }
    
    // Get items sorted by sort_order
    $itemsStmt = $pdo->prepare("SELECT id, done FROM coaching_plan_items WHERE plan_id = ? ORDER BY sort_order");
    $itemsStmt->execute([$request['plan_id']]);
    $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!isset($items[$itemIndex])) {
        http_response_code(404);
        echo json_encode(['error' => 'Item nicht gefunden']);
        exit;
    }
    
    $item = $items[$itemIndex];
    $newDone = $item['done'] ? 0 : 1;
    $completedAt = $newDone ? date('Y-m-d H:i:s') : null;
    
    $updateStmt = $pdo->prepare("UPDATE coaching_plan_items SET done = ?, completed_at = ? WHERE id = ?");
    $updateStmt->execute([$newDone, $completedAt, $item['id']]);
    
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ungueltige Anfrage']);
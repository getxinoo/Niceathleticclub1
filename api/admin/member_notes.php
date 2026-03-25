<?php
/**
 * member_notes.php – Interne Notizen zu Mitgliedern (Member-360)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    ?member_id=X  → Notizen für ein Mitglied
 * POST                 → Neue Notiz anlegen
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: Notizen eines Mitglieds ─────────────────────────────────────────────
if ($method === 'GET') {
    $payload  = require_staff();
    $memberId = (int)($_GET['member_id'] ?? 0);

    if ($memberId < 1) json_error('member_id erforderlich.', 422);

    // Sichtbarkeit nach Rolle filtern
    $role = $payload['role'] ?? '';
    $visWhere = '';
    $visParams = [$memberId];

    if ($role !== 'admin') {
        // Nicht-Admins sehen nur "internal" + ihre eigene Rolle
        $visWhere = " AND (mn.visibility = 'internal' OR mn.visibility = ?)";
        $visParams[] = $role;
    }

    $stmt = db()->prepare(
        "SELECT mn.*, u.name AS author_name
         FROM member_notes mn
         LEFT JOIN users u ON u.id = mn.author_user_id
         WHERE mn.member_id = ? {$visWhere}
         ORDER BY mn.created_at DESC
         LIMIT 100"
    );
    $stmt->execute($visParams);
    json_success($stmt->fetchAll());
}

// ── POST: Neue Notiz ─────────────────────────────────────────────────────────
if ($method === 'POST') {
    $payload = require_staff();
    $body    = get_body();

    if (empty($body['member_id'])) json_error('member_id erforderlich.', 422);
    if (empty($body['body']))      json_error('Notiztext erforderlich.', 422);

    $validVisibility = ['internal', 'trainer', 'finance', 'hr'];
    $validTypes      = ['general', 'finance', 'training', 'support', 'risk'];

    $visibility = in_array($body['visibility'] ?? '', $validVisibility, true)
        ? $body['visibility'] : 'internal';
    $noteType   = in_array($body['note_type'] ?? '', $validTypes, true)
        ? $body['note_type'] : 'general';

    $stmt = db()->prepare(
        "INSERT INTO member_notes (member_id, author_user_id, visibility, note_type, body)
         VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        (int)$body['member_id'],
        (int)$payload['sub'],
        $visibility,
        $noteType,
        trim($body['body']),
    ]);

    // Audit
    try {
        db()->prepare(
            "INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details)
             VALUES (?, ?, 'create_note', 'member', ?, ?)"
        )->execute([
            $payload['sub'],
            $payload['name'],
            (string)$body['member_id'],
            json_encode(['type' => $noteType, 'visibility' => $visibility]),
        ]);
    } catch (\PDOException $e) { /* noop */ }

    json_success(['id' => (int)db()->lastInsertId(), 'status' => 'created'], 201);
}

json_error('Methode nicht erlaubt.', 405);

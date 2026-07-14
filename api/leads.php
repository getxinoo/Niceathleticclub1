<?php
/**
 * leads.php – Leads & Probetraining-Anfragen API
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/leads.php            → Alle Leads (Admin-Dashboard)
 * GET    /api/leads.php?id=1       → Einzelner Lead
 * POST   /api/leads.php            → Neuen Lead anlegen
 * PATCH  /api/leads.php?id=1       → Lead aktualisieren (Status, Notizen, Infos)
 * DELETE /api/leads.php?id=1       → Lead löschen
 */

declare(strict_types=1);
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

// ── Authorization (P1 Security-Hotfix) ───────────────────────────────────────
// Zuvor offen: Lead-PII (Name/E-Mail/Telefon) ohne Anmeldung les-/schreibbar.
// GET erfordert leads.read, alle Schreibmethoden leads.write (Member → 403).
if ($method === 'GET') {
    require_permission('leads.read');
} else {
    require_permission('leads.write');
}

switch ($method) {
    case 'GET':
        $id !== null ? get_lead($id) : list_leads();
        break;
    case 'POST':
        create_lead();
        break;
    case 'PATCH':
        if ($id === null) json_error('Parameter "id" fehlt.');
        update_lead($id);
        break;
    case 'DELETE':
        if ($id === null) json_error('Parameter "id" fehlt.');
        delete_lead($id);
        break;
    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Liste ────────────────────────────────────────────────────────────
function list_leads(): void
{
    $where  = [];
    $params = [];

    $status = $_GET['status'] ?? null;
    $type   = $_GET['type']   ?? null;
    $search = $_GET['search'] ?? null;

    $allowed_statuses = ['Neu', 'Kontaktiert', 'Bestätigt', 'Abgesagt'];
    $allowed_types    = ['contact', 'trial'];

    if ($status !== null && in_array($status, $allowed_statuses, true)) {
        $where[]  = 'status = ?';
        $params[] = $status;
    }
    if ($type !== null && in_array($type, $allowed_types, true)) {
        $where[]  = 'type = ?';
        $params[] = $type;
    }
    if ($search !== null && strlen(trim($search)) >= 2) {
        $where[]  = '(name LIKE ? OR email LIKE ?)';
        $like     = '%' . trim($search) . '%';
        $params[] = $like;
        $params[] = $like;
    }

    $sql = 'SELECT * FROM leads';
    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY created_at DESC';

    $limit  = isset($_GET['limit'])  ? max(1, min(200, (int) $_GET['limit']))  : 50;
    $offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;
    $sql   .= ' LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $leads = $stmt->fetchAll();

    json_success(array_map('normalize_lead', $leads));
}

// ── Handler: Einzelner Lead ───────────────────────────────────────────────────
function get_lead(int $id): void
{
    $stmt = db()->prepare('SELECT * FROM leads WHERE id = ?');
    $stmt->execute([$id]);
    $lead = $stmt->fetch();
    if (!$lead) json_error('Lead nicht gefunden.', 404);
    json_success(normalize_lead($lead));
}

// ── Handler: Lead anlegen ─────────────────────────────────────────────────────
function create_lead(): void
{
    $body = get_body();
    foreach (['name', 'email'] as $field) {
        if (empty(trim((string) ($body[$field] ?? '')))) {
            json_error("Pflichtfeld '{$field}' fehlt.");
        }
    }

    $email = strtolower(trim((string) $body['email']));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Ungültige E-Mail-Adresse.');

    $type = in_array($body['type'] ?? '', ['contact', 'trial'], true) ? $body['type'] : 'trial';
    
    $allowed_goals = ['abnehmen', 'muskelaufbau', 'fitness', 'crossfit'];
    $goal = in_array($body['goal'] ?? '', $allowed_goals, true) ? $body['goal'] : null;

    $desired_date = null;
    if (!empty($body['desiredDate'])) {
        $dt = DateTime::createFromFormat('Y-m-d', $body['desiredDate']);
        if ($dt !== false) $desired_date = $dt->format('Y-m-d');
    }

    // ── Duplikat-Schutz: Gleiche E-Mail + Typ innerhalb der letzten 24h ──
    $stmt_dup = db()->prepare(
        "SELECT id FROM leads
         WHERE email = ? AND type = ?
           AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );
    $stmt_dup->execute([$email, $type]);
    if ($existing = $stmt_dup->fetch()) {
        // Duplikat gefunden → bestehenden Lead zurueckgeben statt Fehler
        $stmt_existing = db()->prepare('SELECT * FROM leads WHERE id = ?');
        $stmt_existing->execute([$existing['id']]);
        json_success(normalize_lead($stmt_existing->fetch()), 200);
    }

    $stmt = db()->prepare('INSERT INTO leads (type, name, email, phone, goal, desired_date, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'Neu\', NOW())');
    $stmt->execute([
        $type, trim((string) $body['name']), $email,
        !empty($body['phone']) ? trim((string) $body['phone']) : null,
        $goal, $desired_date,
        !empty($body['notes']) ? trim((string) $body['notes']) : null,
    ]);

    $new_id = (int) db()->lastInsertId();
    $stmt2  = db()->prepare('SELECT * FROM leads WHERE id = ?');
    $stmt2->execute([$new_id]);
    json_success(normalize_lead($stmt2->fetch()), 201);
}

// ── Handler: Status / Notizen / Alle Felder aktualisieren ────────────────────
function update_lead(int $id): void
{
    $body    = get_body();
    $fields  = [];
    $values  = [];

    // Alle erlaubten Update-Felder definieren
    $allowed_updates = [
        'name' => 'name', 
        'email' => 'email', 
        'phone' => 'phone', 
        'notes' => 'notes', 
        'status' => 'status', 
        'type' => 'type',
        'goal' => 'goal'
    ];

    foreach ($allowed_updates as $json_key => $db_column) {
        if (array_key_exists($json_key, $body)) {
            $fields[] = "$db_column = ?";
            $values[] = $body[$json_key] !== '' ? $body[$json_key] : null;
        }
    }

    // Sonderfall für desiredDate (CamelCase im Frontend, snake_case in der DB)
    if (array_key_exists('desiredDate', $body)) {
        $fields[] = "desired_date = ?";
        $values[] = $body['desiredDate'] !== '' ? $body['desiredDate'] : null;
    }

    if (empty($fields)) json_error('Keine gültigen Felder übergeben.');

    $values[] = $id;
    $stmt = db()->prepare('UPDATE leads SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) {
        $check = db()->prepare('SELECT id FROM leads WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) json_error('Lead nicht gefunden.', 404);
    }

    $stmt2 = db()->prepare('SELECT * FROM leads WHERE id = ?');
    $stmt2->execute([$id]);
    json_success(normalize_lead($stmt2->fetch()));
}

// ── Handler: Löschen ─────────────────────────────────────────────────────────
function delete_lead(int $id): void
{
    $stmt = db()->prepare('DELETE FROM leads WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) json_error('Lead nicht gefunden.', 404);
    http_response_code(204);
    exit();
}

// ── Hilfsfunktion: DB-Zeile → API-Objekt (camelCase inkl. Magicline) ─────────
function normalize_lead(array $lead): array
{
    return [
        'id'          => (string) $lead['id'],
        'magicline_id'=> $lead['magicline_id'] ?? null, // NEU: Magicline ID
        'type'        => $lead['type'],
        'name'        => $lead['name'],
        'email'       => $lead['email'],
        'phone'       => $lead['phone'],
        'goal'        => $lead['goal'],
        'desiredDate' => $lead['desired_date'],
        'status'      => $lead['status'],
        'notes'       => $lead['notes'],
        'createdAt'   => $lead['created_at'],
    ];
}
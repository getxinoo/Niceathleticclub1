<?php
/**
 * tarife.php – Membership Plans / Tarife API
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/tarife.php          → Alle aktiven Tarife (public, kein Auth)
 * GET    /api/tarife.php?all=1    → Alle Tarife inkl. inaktive (Admin)
 * POST   /api/tarife.php          → Neuen Tarif anlegen (Admin)
 * PATCH  /api/tarife.php?id=1     → Tarif aktualisieren (Admin)
 * DELETE /api/tarife.php?id=1     → Tarif loeschen (Admin)
 */

declare(strict_types=1);
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {
    case 'GET':
        $id !== null ? get_plan($id) : list_plans();
        break;

    case 'POST':
        require_admin();
        create_plan();
        break;

    case 'PATCH':
        require_admin();
        if ($id === null) json_error('Parameter "id" fehlt.');
        update_plan($id);
        break;

    case 'DELETE':
        require_admin();
        if ($id === null) json_error('Parameter "id" fehlt.');
        delete_plan($id);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Liste ────────────────────────────────────────────────────────────
function list_plans(): void
{
    $showAll = isset($_GET['all']) && $_GET['all'] === '1';

    if ($showAll) {
        $sql = "SELECT * FROM membership_plans ORDER BY sort_order ASC, id ASC";
    } else {
        $sql = "SELECT * FROM membership_plans WHERE active = 1 ORDER BY sort_order ASC, id ASC";
    }

    $stmt = db()->query($sql);
    $plans = $stmt->fetchAll();
    json_success(array_map('normalize_plan', $plans));
}

// ── Handler: Einzelner Tarif ──────────────────────────────────────────────────
function get_plan(int $id): void
{
    $stmt = db()->prepare('SELECT * FROM membership_plans WHERE id = ?');
    $stmt->execute([$id]);
    $plan = $stmt->fetch();

    if (!$plan) {
        json_error('Tarif nicht gefunden.', 404);
    }

    json_success(normalize_plan($plan));
}

// ── Handler: Anlegen ──────────────────────────────────────────────────────────
function create_plan(): void
{
    $body = get_body();

    if (empty(trim((string)($body['name'] ?? '')))) {
        json_error('Pflichtfeld "name" fehlt.');
    }

    $slug = $body['slug'] ?? strtolower(preg_replace('/[^a-z0-9]+/', '-', strtolower($body['name'])));

    $stmt = db()->prepare(
        'INSERT INTO membership_plans (slug, name, price, period, laufzeit, highlight, badge, description, student_price, features, cta, sort_order, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $stmt->execute([
        trim($slug),
        trim((string)$body['name']),
        (float)($body['price'] ?? 0),
        trim((string)($body['period'] ?? 'pro Monat')),
        trim((string)($body['laufzeit'] ?? '')),
        isset($body['highlight']) ? ($body['highlight'] ? 1 : 0) : 0,
        !empty($body['badge']) ? trim((string)$body['badge']) : null,
        trim((string)($body['description'] ?? '')),
        !empty($body['studentPrice']) ? (float)$body['studentPrice'] : (!empty($body['student_price']) ? (float)$body['student_price'] : null),
        json_encode($body['features'] ?? []),
        trim((string)($body['cta'] ?? 'Jetzt starten')),
        isset($body['sort_order']) ? (int)$body['sort_order'] : 0,
        isset($body['active']) ? ($body['active'] ? 1 : 0) : 1,
    ]);

    $new_id = (int)db()->lastInsertId();
    $stmt2 = db()->prepare('SELECT * FROM membership_plans WHERE id = ?');
    $stmt2->execute([$new_id]);
    json_success(normalize_plan($stmt2->fetch()), 201);
}

// ── Handler: Aktualisieren ────────────────────────────────────────────────────
function update_plan(int $id): void
{
    $body = get_body();
    $fields = [];
    $values = [];

    $map = [
        'slug' => 'string', 'name' => 'string', 'price' => 'float',
        'period' => 'string', 'laufzeit' => 'string',
        'highlight' => 'bool', 'badge' => 'nullable_string',
        'description' => 'string', 'cta' => 'string',
        'sort_order' => 'int', 'active' => 'bool',
    ];

    foreach ($map as $field => $type) {
        if (!array_key_exists($field, $body)) continue;

        switch ($type) {
            case 'string':  $values[] = trim((string)$body[$field]); break;
            case 'float':   $values[] = (float)$body[$field]; break;
            case 'int':     $values[] = (int)$body[$field]; break;
            case 'bool':    $values[] = $body[$field] ? 1 : 0; break;
            case 'nullable_string':
                $values[] = !empty($body[$field]) ? trim((string)$body[$field]) : null;
                break;
        }
        $fields[] = "{$field} = ?";
    }

    // student_price: akzeptiere sowohl studentPrice als auch student_price
    if (array_key_exists('studentPrice', $body) || array_key_exists('student_price', $body)) {
        $sp = $body['studentPrice'] ?? $body['student_price'] ?? null;
        $values[] = $sp ? (float)$sp : null;
        $fields[] = "student_price = ?";
    }

    // features als JSON
    if (array_key_exists('features', $body)) {
        $values[] = json_encode($body['features'] ?? []);
        $fields[] = "features = ?";
    }

    if (empty($fields)) {
        json_error('Keine Aenderungen uebergeben.');
    }

    $values[] = $id;
    $stmt = db()->prepare('UPDATE membership_plans SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    $stmt2 = db()->prepare('SELECT * FROM membership_plans WHERE id = ?');
    $stmt2->execute([$id]);
    $plan = $stmt2->fetch();

    if (!$plan) json_error('Tarif nicht gefunden.', 404);
    json_success(normalize_plan($plan));
}

// ── Handler: Loeschen ─────────────────────────────────────────────────────────
function delete_plan(int $id): void
{
    $stmt_check = db()->prepare('SELECT name FROM membership_plans WHERE id = ?');
    $stmt_check->execute([$id]);
    if (!$stmt_check->fetch()) json_error('Tarif nicht gefunden.', 404);

    $stmt = db()->prepare('DELETE FROM membership_plans WHERE id = ?');
    $stmt->execute([$id]);

    http_response_code(204);
    exit();
}

// ── Hilfsfunktion: DB-Zeile → API-Objekt ─────────────────────────────────────
function normalize_plan(array $p): array
{
    $features = $p['features'];
    if (is_string($features)) $features = json_decode($features, true) ?? [];

    return [
        'id'           => (string)$p['id'],
        'slug'         => $p['slug'],
        'name'         => $p['name'],
        'price'        => (float)$p['price'],
        'period'       => $p['period'] ?? 'pro Monat',
        'laufzeit'     => $p['laufzeit'] ?? '',
        'highlight'    => (bool)$p['highlight'],
        'badge'        => $p['badge'] ?? null,
        'description'  => $p['description'] ?? '',
        'studentPrice' => $p['student_price'] ? (float)$p['student_price'] : null,
        'features'     => $features,
        'cta'          => $p['cta'] ?? 'Jetzt starten',
        'sort_order'   => (int)($p['sort_order'] ?? 0),
        'active'       => (bool)($p['active'] ?? 1),
    ];
}

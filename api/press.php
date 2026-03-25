<?php
/**
 * press.php – Presseberichte / Medienerwaehnungen API
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/press.php          → Alle Presseberichte (public, kein Auth)
 * POST   /api/press.php          → Neuen Pressebericht anlegen (Admin)
 * PATCH  /api/press.php?id=1     → Pressebericht aktualisieren (Admin)
 * DELETE /api/press.php?id=1     → Pressebericht loeschen (Admin)
 */

declare(strict_types=1);
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {
    case 'GET':
        $id !== null ? get_article($id) : list_articles();
        break;

    case 'POST':
        require_admin();
        create_article();
        break;

    case 'PATCH':
        require_admin();
        if ($id === null) json_error('Parameter "id" fehlt.');
        update_article($id);
        break;

    case 'DELETE':
        require_admin();
        if ($id === null) json_error('Parameter "id" fehlt.');
        delete_article($id);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Liste ────────────────────────────────────────────────────────────
function list_articles(): void
{
    $stmt = db()->query("SELECT * FROM press_articles ORDER BY date DESC, id DESC");
    $articles = $stmt->fetchAll();
    json_success(array_map('normalize_article', $articles));
}

// ── Handler: Einzelner Artikel ────────────────────────────────────────────────
function get_article(int $id): void
{
    $stmt = db()->prepare('SELECT * FROM press_articles WHERE id = ?');
    $stmt->execute([$id]);
    $article = $stmt->fetch();

    if (!$article) {
        json_error('Pressebericht nicht gefunden.', 404);
    }

    json_success(normalize_article($article));
}

// ── Handler: Anlegen ──────────────────────────────────────────────────────────
function create_article(): void
{
    $body = get_body();

    $required = ['outlet', 'title', 'date'];
    foreach ($required as $field) {
        if (empty(trim((string)($body[$field] ?? '')))) {
            json_error("Pflichtfeld '{$field}' fehlt.");
        }
    }

    // ── Duplikat-Schutz: Gleicher Titel + Outlet ─────────────────────────
    $stmt_dup = db()->prepare(
        "SELECT id FROM press_articles WHERE title = ? AND outlet = ?"
    );
    $stmt_dup->execute([
        trim((string)$body['title']),
        trim((string)$body['outlet']),
    ]);
    if ($existing = $stmt_dup->fetch()) {
        // Duplikat → bestehenden Artikel zurueckgeben
        $stmt_ex = db()->prepare('SELECT * FROM press_articles WHERE id = ?');
        $stmt_ex->execute([$existing['id']]);
        json_success(normalize_article($stmt_ex->fetch()), 200);
    }

    $stmt = db()->prepare(
        'INSERT INTO press_articles (outlet, title, date, media_type, url, excerpt, image)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    $stmt->execute([
        trim((string)$body['outlet']),
        trim((string)$body['title']),
        trim((string)$body['date']),
        trim((string)($body['mediaType'] ?? $body['media_type'] ?? 'Online')),
        !empty($body['url']) ? trim((string)$body['url']) : null,
        !empty($body['excerpt']) ? trim((string)$body['excerpt']) : null,
        !empty($body['image']) ? trim((string)$body['image']) : null,
    ]);

    $new_id = (int)db()->lastInsertId();
    $stmt2 = db()->prepare('SELECT * FROM press_articles WHERE id = ?');
    $stmt2->execute([$new_id]);
    json_success(normalize_article($stmt2->fetch()), 201);
}

// ── Handler: Aktualisieren ────────────────────────────────────────────────────
function update_article(int $id): void
{
    $body = get_body();
    $fields = [];
    $values = [];

    $allowed = ['outlet', 'title', 'date', 'url', 'excerpt', 'image'];
    foreach ($allowed as $field) {
        if (!array_key_exists($field, $body)) continue;
        $values[] = !empty($body[$field]) ? trim((string)$body[$field]) : null;
        $fields[] = "{$field} = ?";
    }

    // media_type: akzeptiere sowohl mediaType als auch media_type
    if (array_key_exists('mediaType', $body) || array_key_exists('media_type', $body)) {
        $values[] = trim((string)($body['mediaType'] ?? $body['media_type'] ?? 'Online'));
        $fields[] = "media_type = ?";
    }

    if (empty($fields)) {
        json_error('Keine Aenderungen uebergeben.');
    }

    $values[] = $id;
    $stmt = db()->prepare('UPDATE press_articles SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    $stmt2 = db()->prepare('SELECT * FROM press_articles WHERE id = ?');
    $stmt2->execute([$id]);
    $article = $stmt2->fetch();

    if (!$article) json_error('Pressebericht nicht gefunden.', 404);
    json_success(normalize_article($article));
}

// ── Handler: Loeschen ─────────────────────────────────────────────────────────
function delete_article(int $id): void
{
    $stmt_check = db()->prepare('SELECT title FROM press_articles WHERE id = ?');
    $stmt_check->execute([$id]);
    if (!$stmt_check->fetch()) json_error('Pressebericht nicht gefunden.', 404);

    $stmt = db()->prepare('DELETE FROM press_articles WHERE id = ?');
    $stmt->execute([$id]);

    json_success(['success' => true]);
}

// ── Hilfsfunktion: DB-Zeile → API-Objekt ─────────────────────────────────────
function normalize_article(array $a): array
{
    return [
        'id'        => (string)$a['id'],
        'outlet'    => $a['outlet'],
        'title'     => $a['title'],
        'date'      => $a['date'],
        'mediaType' => $a['media_type'] ?? 'Online',
        'url'       => $a['url'] ?? '',
        'excerpt'   => $a['excerpt'] ?? '',
        'image'     => $a['image'] ?? '',
    ];
}
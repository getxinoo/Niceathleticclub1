<?php
/**
 * press.php – REST API fuer Presseberichte / Medienerwaehnungen
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpunkte:
 *   GET    /press.php          → Alle Presseberichte (sortiert nach Datum DESC)
 *   GET    /press.php?id=X     → Einzelner Pressebericht
 *   POST   /press.php          → Neuer Pressebericht anlegen
 *   PATCH  /press.php?id=X     → Pressebericht aktualisieren
 *   DELETE /press.php?id=X     → Pressebericht loeschen
 *
 * Tabelle: press_articles
 *   id          INT AUTO_INCREMENT PRIMARY KEY
 *   outlet      VARCHAR(255) NOT NULL
 *   title       TEXT NOT NULL
 *   url         TEXT NOT NULL
 *   date        DATE NOT NULL
 *   media_type  ENUM('Online','Print','Print / Online','TV','Radio','Podcast') DEFAULT 'Online'
 *   excerpt     TEXT NULL
 *   image       TEXT NULL
 *   created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *   updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 *
 * SQL:
 *   CREATE TABLE IF NOT EXISTS press_articles (
 *     id          INT AUTO_INCREMENT PRIMARY KEY,
 *     outlet      VARCHAR(255) NOT NULL,
 *     title       TEXT NOT NULL,
 *     url         TEXT NOT NULL,
 *     date        DATE NOT NULL,
 *     media_type  ENUM('Online','Print','Print / Online','TV','Radio','Podcast') DEFAULT 'Online',
 *     excerpt     TEXT NULL,
 *     image       TEXT NULL,
 *     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 *   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── DB-Verbindung (eigene config.php oder hier anpassen) ─────────────────────
// config.php liegt im gleichen Verzeichnis wie press.php (also im /api/ Ordner)
require_once __DIR__ . '/config.php'; // erwartet $pdo (PDO-Instanz)

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;

try {
    switch ($method) {

        // ── GET: Liste oder Einzeln ─────────────────────────────────────────
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare('SELECT * FROM press_articles WHERE id = ?');
                $stmt->execute([$id]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Pressebericht nicht gefunden']);
                    exit;
                }
                echo json_encode(normalizeRow($row));
            } else {
                $stmt = $pdo->query('SELECT * FROM press_articles ORDER BY date DESC, created_at DESC');
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(array_map('normalizeRow', $rows));
            }
            break;

        // ── POST: Neu anlegen ───────────────────────────────────────────────
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['outlet']) || empty($data['title']) || empty($data['url'])) {
                http_response_code(400);
                echo json_encode(['error' => 'outlet, title und url sind Pflichtfelder']);
                exit;
            }

            $stmt = $pdo->prepare('
                INSERT INTO press_articles (outlet, title, url, date, media_type, excerpt, image)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $data['outlet'],
                $data['title'],
                $data['url'],
                $data['date'] ?? date('Y-m-d'),
                $data['mediaType'] ?? 'Online',
                $data['excerpt'] ?? null,
                $data['image'] ?? null,
            ]);

            $newId = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM press_articles WHERE id = ?');
            $stmt->execute([$newId]);
            echo json_encode(normalizeRow($stmt->fetch(PDO::FETCH_ASSOC)));
            http_response_code(201);
            break;

        // ── PATCH: Aktualisieren ────────────────────────────────────────────
        case 'PATCH':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'id Parameter fehlt']);
                exit;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $fields = [];
            $values = [];
            $allowed = [
                'outlet'    => 'outlet',
                'title'     => 'title',
                'url'       => 'url',
                'date'      => 'date',
                'mediaType' => 'media_type',
                'excerpt'   => 'excerpt',
                'image'     => 'image',
            ];

            foreach ($allowed as $jsonKey => $dbCol) {
                if (array_key_exists($jsonKey, $data)) {
                    $fields[] = "$dbCol = ?";
                    $values[] = $data[$jsonKey];
                }
            }

            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error' => 'Keine aktualisierbaren Felder']);
                exit;
            }

            $values[] = $id;
            $sql = 'UPDATE press_articles SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $pdo->prepare($sql)->execute($values);

            $stmt = $pdo->prepare('SELECT * FROM press_articles WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(normalizeRow($stmt->fetch(PDO::FETCH_ASSOC)));
            break;

        // ── DELETE: Loeschen ────────────────────────────────────────────────
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'id Parameter fehlt']);
                exit;
            }
            $stmt = $pdo->prepare('DELETE FROM press_articles WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Methode nicht erlaubt']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Datenbankfehler: ' . $e->getMessage()]);
}

// ── Helper: DB-Zeile → Frontend-Format ──────────────────────────────────────
function normalizeRow(array $row): array {
    return [
        'id'        => 'press-' . $row['id'],
        'outlet'    => $row['outlet'],
        'title'     => $row['title'],
        'url'       => $row['url'],
        'date'      => $row['date'],
        'mediaType' => $row['media_type'],
        'excerpt'   => $row['excerpt'],
        'image'     => $row['image'],
    ];
}
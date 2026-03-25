<?php
/**
 * pages.php – CMS Sitebuilder Block-Storage
 * ─────────────────────────────────────────────────────────────────────────────
 * Speichert und liest Block-Konfigurationen für alle Seiten der NAC React-App.
 * PHP 7.4 kompatibel (kein str_contains, kein match-Expression).
 *
 * Endpunkte:
 *   GET  /pages.php?slug=<slug>  → Blöcke einer Seite laden
 *                                   Response: { blocks: [...], published: true }
 *   PUT  /pages.php              → Blöcke einer Seite speichern
 *                                   Body:     { slug, blocks: [...], published }
 *                                   Response: { success: true, message: "..." }
 *   POST /pages.php              → Alias für PUT (Abwärtskompatibilität)
 *
 * Tabelle: page_blocks
 *   slug        VARCHAR(120) PRIMARY KEY
 *   blocks_json MEDIUMTEXT NOT NULL          (JSON-Array der Blöcke)
 *   published   TINYINT(1) NOT NULL DEFAULT 1
 *   updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 *
 * SQL zum Anlegen der Tabelle:
 *   CREATE TABLE IF NOT EXISTS page_blocks (
 *     slug        VARCHAR(120) NOT NULL,
 *     blocks_json MEDIUMTEXT   NOT NULL,
 *     published   TINYINT(1)   NOT NULL DEFAULT 1,
 *     updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *     PRIMARY KEY (slug)
 *   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 *
 * WICHTIG: INFORMATION_SCHEMA ist auf Checkdomain gesperrt.
 *          ADD COLUMN IF NOT EXISTS wird nicht unterstützt.
 *          Jede ALTER TABLE-Spalte muss in einem eigenen Statement stehen.
 *          PHP-8.0+-Funktionen wie str_contains() sind verboten – strpos() verwenden.
 */

require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

// ── OPTIONS (Preflight) ───────────────────────────────────────────────────────
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── DB ────────────────────────────────────────────────────────────────────────
require_once __DIR__ . '/config.php'; // liefert $pdo (PDO-Instanz)

// ── Tabelle anlegen falls nicht vorhanden ─────────────────────────────────────
// KEIN IF NOT EXISTS für Spalten (MySQL 5.7 auf Checkdomain unterstützt es nicht).
// Wir prüfen nur ob die Tabelle selbst existiert, dann erstellen wir sie.
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS page_blocks (
            slug        VARCHAR(120) NOT NULL,
            blocks_json MEDIUMTEXT   NOT NULL,
            published   TINYINT(1)   NOT NULL DEFAULT 1,
            updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (PDOException $e) {
    // Tabelle existiert bereits oder Rechtefehler → weitermachen
}

// ── GET: Blöcke laden ─────────────────────────────────────────────────────────
if ($method === 'GET') {
    $slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';

    if ($slug === '') {
        http_response_code(400);
        echo json_encode(['error' => 'slug Parameter fehlt']);
        exit;
    }

    // Slug säubern: nur Buchstaben, Ziffern, Bindestriche
    $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower($slug));

    try {
        $stmt = $pdo->prepare('SELECT blocks_json, published FROM page_blocks WHERE slug = ?');
        $stmt->execute([$slug]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            // Seite noch nicht gespeichert → leeres Ergebnis (kein Fehler)
            echo json_encode(['blocks' => [], 'published' => true]);
            exit;
        }

        $blocks = json_decode($row['blocks_json'], true);
        if (!is_array($blocks)) {
            $blocks = [];
        }

        echo json_encode([
            'blocks'    => $blocks,
            'published' => (bool) $row['published'],
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Datenbankfehler: ' . $e->getMessage()]);
    }
    exit;
}

// ── PUT / POST: Blöcke speichern ──────────────────────────────────────────────
if ($method === 'PUT' || $method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Ungültiger JSON-Body']);
        exit;
    }

    $slug = isset($data['slug']) ? trim($data['slug']) : '';
    if ($slug === '') {
        http_response_code(400);
        echo json_encode(['error' => 'slug fehlt im Body']);
        exit;
    }

    // Slug säubern
    $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower($slug));

    $blocks    = isset($data['blocks'])    && is_array($data['blocks']) ? $data['blocks'] : [];
    $published = isset($data['published']) ? (int)(bool)$data['published']                : 1;

    $blocksJson = json_encode($blocks, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    try {
        // UPSERT: INSERT … ON DUPLICATE KEY UPDATE
        $stmt = $pdo->prepare('
            INSERT INTO page_blocks (slug, blocks_json, published)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                blocks_json = VALUES(blocks_json),
                published   = VALUES(published),
                updated_at  = CURRENT_TIMESTAMP
        ');
        $stmt->execute([$slug, $blocksJson, $published]);

        echo json_encode([
            'success'   => true,
            'message'   => 'Seite "' . $slug . '" gespeichert.',
            'blocks'    => count($blocks),
            'published' => (bool) $published,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Datenbankfehler: ' . $e->getMessage()]);
    }
    exit;
}

// ── Methode nicht erlaubt ─────────────────────────────────────────────────────
http_response_code(405);
echo json_encode(['error' => 'Methode nicht erlaubt. Erlaubt: GET, PUT, POST']);

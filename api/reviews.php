<?php
/**
 * reviews.php – Google Reviews API
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpunkte:
 *   GET    /api/reviews.php              → Sichtbare Reviews (public, kein Auth)
 *   GET    /api/reviews.php?all=1        → Alle Reviews + Stats (Admin)
 *   POST   /api/reviews.php?action=sync  → Google Places API Sync (Admin)
 *   PATCH  /api/reviews.php?id=X         → Review updaten (visible togglen)
 *   DELETE /api/reviews.php?id=X         → Review aus DB löschen
 *
 * Benötigt: Tabellen google_reviews + review_stats (siehe /api/sql/reviews_setup.sql)
 * Google-Keys: GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID in config.php
 */

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = $_GET['id']     ?? '';
$all    = $_GET['all']    ?? '';
$pdo    = db();


// ── Hilfsfunktion: Review-Row → JSON-Objekt ─────────────────────────────────
function map_review(array $r): array
{
    return [
        'id'           => (string)$r['id'],
        'author'       => $r['author'],
        'rating'       => (int)$r['rating'],
        'text'         => $r['text'],
        'publishedAt'  => $r['published_at'],
        'profilePhoto' => $r['profile_photo'] ?? null,
        'visible'      => (bool)$r['visible'],
        'source'       => $r['source'] ?? 'google',
    ];
}

// ── Hilfsfunktion: Stats aus DB lesen ────────────────────────────────────────
function get_stats(PDO $pdo): ?array
{
    $stmt = $pdo->query("SELECT * FROM review_stats WHERE id = 1");
    $row  = $stmt->fetch();
    if (!$row) return null;

    return [
        'averageRating'      => (float)$row['average_rating'],
        'totalReviews'       => (int)$row['total_reviews'],
        'ratingDistribution' => [
            5 => (int)$row['rating_5'],
            4 => (int)$row['rating_4'],
            3 => (int)$row['rating_3'],
            2 => (int)$row['rating_2'],
            1 => (int)$row['rating_1'],
        ],
        'lastSyncedAt' => $row['last_synced_at'],
    ];
}

// ── Hilfsfunktion: Rating-Verteilung neu berechnen ───────────────────────────
function recalc_stats(PDO $pdo, ?float $googleAvg = null, ?int $googleTotal = null): void
{
    // Verteilung aus lokaler DB
    $stmt = $pdo->query("SELECT rating, COUNT(*) as cnt FROM google_reviews GROUP BY rating");
    $dist = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
    while ($row = $stmt->fetch()) {
        $dist[(int)$row['rating']] = (int)$row['cnt'];
    }

    // Durchschnitt + Gesamt: Google-Werte bevorzugen, sonst lokal berechnen
    $localTotal = array_sum($dist);
    $localAvg   = $localTotal > 0
        ? round(array_sum(array_map(fn($r, $c) => $r * $c, array_keys($dist), $dist)) / $localTotal, 1)
        : 0;

    $avg   = $googleAvg   ?? $localAvg;
    $total = $googleTotal ?? $localTotal;

    $pdo->prepare("
        INSERT INTO review_stats (id, average_rating, total_reviews, rating_5, rating_4, rating_3, rating_2, rating_1, last_synced_at)
        VALUES (1, :avg, :total, :r5, :r4, :r3, :r2, :r1, NOW())
        ON DUPLICATE KEY UPDATE
            average_rating = VALUES(average_rating),
            total_reviews  = VALUES(total_reviews),
            rating_5       = VALUES(rating_5),
            rating_4       = VALUES(rating_4),
            rating_3       = VALUES(rating_3),
            rating_2       = VALUES(rating_2),
            rating_1       = VALUES(rating_1),
            last_synced_at = NOW()
    ")->execute([
        ':avg'   => $avg,
        ':total' => $total,
        ':r5'    => $dist[5],
        ':r4'    => $dist[4],
        ':r3'    => $dist[3],
        ':r2'    => $dist[2],
        ':r1'    => $dist[1],
    ]);
}


// ═════════════════════════════════════════════════════════════════════════════
// GET – Reviews laden
// ═════════════════════════════════════════════════════════════════════════════
if ($method === 'GET') {

    // Admin: alle Reviews + Stats
    if ($all === '1') {
        require_admin();

        $stmt    = $pdo->query("SELECT * FROM google_reviews ORDER BY published_at DESC");
        $reviews = $stmt->fetchAll();

        json_success([
            'reviews' => array_map('map_review', $reviews),
            'stats'   => get_stats($pdo),
        ]);
    }

    // Public: nur sichtbare Reviews, sortiert nach Datum
    $stmt    = $pdo->query("SELECT * FROM google_reviews WHERE visible = 1 ORDER BY published_at DESC");
    $reviews = $stmt->fetchAll();

    json_success(array_map('map_review', $reviews));
}


// ═════════════════════════════════════════════════════════════════════════════
// POST – Google Places API Sync
// ═════════════════════════════════════════════════════════════════════════════
if ($method === 'POST' && $action === 'sync') {
    require_admin();

    // Prüfe ob API-Key konfiguriert ist
    if (empty(GOOGLE_PLACES_API_KEY) || empty(GOOGLE_PLACE_ID)) {
        json_error(
            'Google Places API nicht konfiguriert. '
            . 'Bitte GOOGLE_PLACES_API_KEY und GOOGLE_PLACE_ID in config.php eintragen.',
            503
        );
    }

    // ── Google Places API aufrufen ───────────────────────────────────────────
    // Doku: https://developers.google.com/maps/documentation/places/web-service/details
    //
    // HINWEIS: Die Places API (Legacy) gibt max. 5 Reviews zurück.
    // Für mehr Reviews: regelmäßige Cron-Syncs oder Places API (New) nutzen.
    $url = 'https://maps.googleapis.com/maps/api/place/details/json?'
         . http_build_query([
               'place_id' => GOOGLE_PLACE_ID,
               'fields'   => 'reviews,rating,user_ratings_total',
               'language' => 'de',
               'key'      => GOOGLE_PLACES_API_KEY,
           ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200 || $response === false) {
        json_error(
            'Google Places API nicht erreichbar (HTTP ' . $httpCode . '). ' . $curlErr,
            502
        );
    }

    $data = json_decode($response, true);
    if (!$data || ($data['status'] ?? '') !== 'OK') {
        $status = $data['status'] ?? 'UNKNOWN';
        $errMsg = $data['error_message'] ?? 'Keine Details';
        json_error("Google API Fehler: {$status} – {$errMsg}", 502);
    }

    $result  = $data['result'] ?? [];
    $reviews = $result['reviews'] ?? [];
    $imported = 0;

    // ── Reviews in DB upserten ───────────────────────────────────────────────
    $stmt = $pdo->prepare("
        INSERT INTO google_reviews (google_id, author, rating, text, published_at, profile_photo, source)
        VALUES (:gid, :author, :rating, :text, FROM_UNIXTIME(:time), :photo, 'google')
        ON DUPLICATE KEY UPDATE
            rating        = VALUES(rating),
            text          = VALUES(text),
            profile_photo = VALUES(profile_photo),
            updated_at    = NOW()
    ");

    foreach ($reviews as $review) {
        // Pseudo-ID aus Author + Timestamp (Google liefert keine stabile Review-ID)
        $googleId = md5(($review['author_name'] ?? '') . ($review['time'] ?? ''));

        $stmt->execute([
            ':gid'    => $googleId,
            ':author' => $review['author_name'] ?? 'Anonym',
            ':rating' => (int)($review['rating'] ?? 5),
            ':text'   => $review['text'] ?? '',
            ':time'   => (int)($review['time'] ?? time()),
            ':photo'  => $review['profile_photo_url'] ?? null,
        ]);

        $imported++;
    }

    // ── Stats aktualisieren ──────────────────────────────────────────────────
    $googleAvg   = isset($result['rating']) ? (float)$result['rating'] : null;
    $googleTotal = isset($result['user_ratings_total']) ? (int)$result['user_ratings_total'] : null;
    recalc_stats($pdo, $googleAvg, $googleTotal);

    json_success([
        'success'  => true,
        'message'  => "{$imported} Reviews von Google synchronisiert.",
        'imported' => $imported,
        'stats'    => get_stats($pdo),
    ]);
}


// ═════════════════════════════════════════════════════════════════════════════
// PATCH – Review updaten (Sichtbarkeit)
// ═════════════════════════════════════════════════════════════════════════════
if ($method === 'PATCH' && $id) {
    require_admin();

    $body = get_body();

    // visible togglen
    if (array_key_exists('visible', $body)) {
        $visible = (int)(bool)$body['visible'];
        $stmt = $pdo->prepare("UPDATE google_reviews SET visible = :vis WHERE id = :id");
        $stmt->execute([':vis' => $visible, ':id' => $id]);

        if ($stmt->rowCount() === 0) {
            json_error("Review mit ID {$id} nicht gefunden.", 404);
        }

        json_success(['success' => true, 'id' => $id, 'visible' => (bool)$visible]);
    }

    json_error('Kein gültiges Feld zum Aktualisieren angegeben.');
}


// ═════════════════════════════════════════════════════════════════════════════
// DELETE – Review aus DB entfernen
// ═════════════════════════════════════════════════════════════════════════════
if ($method === 'DELETE' && $id) {
    require_admin();

    $stmt = $pdo->prepare("DELETE FROM google_reviews WHERE id = :id");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        json_error("Review mit ID {$id} nicht gefunden.", 404);
    }

    // Stats neu berechnen nach Löschung
    recalc_stats($pdo);

    json_success(['success' => true, 'message' => 'Review gelöscht.']);
}


// ── Fallback ─────────────────────────────────────────────────────────────────
json_error('Ungültige Anfrage.', 400);

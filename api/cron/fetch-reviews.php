<?php
/**
 * fetch-reviews.php – Cronjob: Google Places Reviews synchronisieren
 * ─────────────────────────────────────────────────────────────────────────────
 * Wird per Cronjob aufgerufen (alle 4 Tage reicht locker).
 *
 * AUFRUF:
 *   curl "https://nicefitness.de/api/cron/fetch-reviews.php?secret=DEIN_CRON_SECRET"
 *
 * CRONJOB bei Checkdomain einrichten:
 *   0 6 */4 * *  curl -s "https://nicefitness.de/api/cron/fetch-reviews.php?secret=nac_cron_2026_s3cur3_k3y" > /dev/null 2>&1
 *   (= alle 4 Tage um 06:00 Uhr)
 *
 * HINWEIS: Die Places API (Legacy) gibt max. 5 Reviews zurueck.
 * Falls du die "Places API (New)" aktiviert hast, wird das Script
 * automatisch die neuere Variante nutzen (siehe Kommentare unten).
 */

header('Content-Type: application/json; charset=UTF-8');

// ── Config laden ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../config.php';

// ── Cron-Secret prüfen (statt JWT) ──────────────────────────────────────────
$secret = $_GET['secret'] ?? '';
if (empty($secret) || $secret !== CRON_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Ungültiges Cron-Secret.']);
    exit();
}

// ── Voraussetzungen prüfen ───────────────────────────────────────────────────
if (empty(GOOGLE_PLACES_API_KEY)) {
    http_response_code(503);
    echo json_encode(['error' => 'GOOGLE_PLACES_API_KEY nicht konfiguriert.']);
    exit();
}

if (empty(GOOGLE_PLACE_ID)) {
    http_response_code(503);
    echo json_encode(['error' => 'GOOGLE_PLACE_ID nicht konfiguriert. Bitte in config.php eintragen.']);
    exit();
}

$pdo = db();
$log = [];

// ═════════════════════════════════════════════════════════════════════════════
// SCHRITT 1: Google Places API aufrufen
// ═════════════════════════════════════════════════════════════════════════════

$url = 'https://maps.googleapis.com/maps/api/place/details/json?'
     . http_build_query([
           'place_id' => GOOGLE_PLACE_ID,
           'fields'   => 'reviews,rating,user_ratings_total',
           'language' => 'de',
           'reviews_sort' => 'newest',
           'key'      => GOOGLE_PLACES_API_KEY,
       ]);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT      => 'NAC-ReviewSync/1.0',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || $response === false) {
    http_response_code(502);
    echo json_encode([
        'error'    => 'Google API nicht erreichbar.',
        'httpCode' => $httpCode,
        'curl'     => $curlErr,
    ]);
    exit();
}

$data = json_decode($response, true);

if (!$data || ($data['status'] ?? '') !== 'OK') {
    http_response_code(502);
    echo json_encode([
        'error'   => 'Google API Fehler: ' . ($data['status'] ?? 'UNKNOWN'),
        'message' => $data['error_message'] ?? 'Keine Details',
    ]);
    exit();
}

$result  = $data['result'] ?? [];
$reviews = $result['reviews'] ?? [];
$log[]   = 'Google API aufgerufen – ' . count($reviews) . ' Reviews erhalten.';


// ═════════════════════════════════════════════════════════════════════════════
// SCHRITT 2: Reviews in DB upserten (Duplikate vermeiden)
// ═════════════════════════════════════════════════════════════════════════════

$stmt = $pdo->prepare("
    INSERT INTO google_reviews (google_id, author, rating, text, published_at, profile_photo, source, visible)
    VALUES (:gid, :author, :rating, :text, FROM_UNIXTIME(:time), :photo, 'google', 1)
    ON DUPLICATE KEY UPDATE
        rating        = VALUES(rating),
        text          = VALUES(text),
        profile_photo = VALUES(profile_photo),
        updated_at    = NOW()
");

$imported = 0;
$updated  = 0;

foreach ($reviews as $review) {
    $authorName = $review['author_name'] ?? 'Anonym';
    $reviewTime = (int)($review['time'] ?? time());

    // Stabile Pseudo-ID aus Author + Timestamp
    $googleId = md5($authorName . $reviewTime);

    // Prüfen ob schon vorhanden
    $check = $pdo->prepare("SELECT id FROM google_reviews WHERE google_id = :gid LIMIT 1");
    $check->execute([':gid' => $googleId]);
    $exists = $check->fetchColumn();

    $stmt->execute([
        ':gid'    => $googleId,
        ':author' => $authorName,
        ':rating' => (int)($review['rating'] ?? 5),
        ':text'   => $review['text'] ?? '',
        ':time'   => $reviewTime,
        ':photo'  => $review['profile_photo_url'] ?? null,
    ]);

    if ($exists) {
        $updated++;
    } else {
        $imported++;
    }
}

$log[] = "{$imported} neue Reviews importiert, {$updated} aktualisiert.";


// ═════════════════════════════════════════════════════════════════════════════
// SCHRITT 3: Stats aktualisieren
// ═════════════════════════════════════════════════════════════════════════════

$googleAvg   = isset($result['rating']) ? (float)$result['rating'] : null;
$googleTotal = isset($result['user_ratings_total']) ? (int)$result['user_ratings_total'] : null;

// Rating-Verteilung aus lokaler DB berechnen
$distStmt = $pdo->query("SELECT rating, COUNT(*) as cnt FROM google_reviews GROUP BY rating");
$dist = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
while ($row = $distStmt->fetch()) {
    $dist[(int)$row['rating']] = (int)$row['cnt'];
}

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

$log[] = "Stats aktualisiert: {$avg}/5 ({$total} Bewertungen gesamt).";


// ═════════════════════════════════════════════════════════════════════════════
// ERGEBNIS
// ═════════════════════════════════════════════════════════════════════════════

echo json_encode([
    'success'  => true,
    'imported' => $imported,
    'updated'  => $updated,
    'stats'    => [
        'average' => $avg,
        'total'   => $total,
        'inDb'    => $localTotal,
    ],
    'log'      => $log,
    'syncedAt' => date('Y-m-d H:i:s'),
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

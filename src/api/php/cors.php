<?php
/**
 * cors.php – Zentrales CORS-Handling für die NAC PHP-API
 * ─────────────────────────────────────────────────────────────────────────────
 * PHP 7.4 kompatibel. Kein str_contains() – strpos() verwenden.
 *
 * Einbinden in JEDE PHP-API-Datei als ALLERERSTES Statement:
 *   require_once __DIR__ . '/cors.php';
 *
 * Erlaubte Origins:
 *   – Alle localhost-Varianten (für lokale Entwicklung)
 *   – nicefitness.de / niceathleticclub.de (Produktionsdomains)
 *   – figma.com / figma-make.com (Figma Make Preview)
 *   – *.vercel.app / *.netlify.app (Deployment-Previews)
 *
 * Methoden: GET, POST, PUT, PATCH, DELETE, OPTIONS
 * Headers:  Content-Type, Authorization, X-Requested-With
 */

// ── Erlaubte Origins (PHP 7.4: strpos statt str_contains) ────────────────────
$allowedPatterns = [
    'localhost',
    '127.0.0.1',
    '::1',
    'nicefitness.de',
    'niceathleticclub.de',
    'nice-fitness.de',
    'figma.com',
    'figma-make.com',
    'figmamake.com',
    'figma.site',
    'vercel.app',
    'netlify.app',
    'xinoo.io',
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

$originAllowed = false;
if ($origin !== '') {
    foreach ($allowedPatterns as $pattern) {
        // PHP 7.4 kompatibel: strpos() statt str_contains()
        if (strpos($origin, $pattern) !== false) {
            $originAllowed = true;
            break;
        }
    }
}

// Im Development auch ohne Origin erlauben (z.B. Postman, cURL)
if ($origin === '') {
    $originAllowed = true;
    $origin = '*';
}

if ($originAllowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    // Origin nicht erlaubt → CORS-Fehler
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error'  => 'CORS: Origin nicht erlaubt.',
        'origin' => $origin,
    ]);
    exit;
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400'); // 24h Cache für Preflight

// ── OPTIONS Preflight sofort beantworten ─────────────────────────────────────
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

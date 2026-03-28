<?php
/**
 * index.php – NAC API Front Controller / Router
 * ─────────────────────────────────────────────────────────────────────────────
 * Alle API-Requests laufen via .htaccess durch diese Datei.
 * Der Router mappt URL-Pfade auf die jeweiligen PHP-Endpoint-Dateien.
 *
 * Beispiele:
 *   GET  /api/health           → Health-Check (inline)
 *   POST /api/auth/login       → login.php
 *   GET  /api/team             → team.php
 *   GET  /api/admin/members    → admin/members.php
 *   GET  /api/member/profile   → member/profile.php
 */
declare(strict_types=1);

// ── Config laden (enthält CORS-Header, PDO, Response-Helfer, JWT) ─────────────
require_once __DIR__ . '/config.php';

// ── Request-Pfad ermitteln ────────────────────────────────────────────────────
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$scriptDir  = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php'), '/'); // z.B. "/api"

// Basis-Pfad abschneiden
$path = $requestUri;
if (strpos($path, $scriptDir) === 0) {
    $path = substr($path, strlen($scriptDir));
}

// Query-String entfernen
$qPos = strpos($path, '?');
if ($qPos !== false) {
    $path = substr($path, 0, $qPos);
}

// Slashes normalisieren
$path = trim($path, '/');

// ── Route-Map ─────────────────────────────────────────────────────────────────
$routes = [

    // Health-Check
    ''                          => '__health__',
    'health'                    => '__health__',

    // Auth
    'auth/login'                => 'login.php',
    'login'                     => 'login.php',
    'login.php'                 => 'login.php',

    // Public (kein Auth erforderlich)
    'public/settings'           => 'public/settings.php',
    'public/settings.php'       => 'public/settings.php',
    'public/pricing'            => 'public/pricing.php',
    'public/pricing.php'        => 'public/pricing.php',
    'public/page-visibility'    => 'public/page-visibility.php',
    'public/page-visibility.php'=> 'public/page-visibility.php',

    // Allgemeine Endpunkte
    'team'                      => 'team.php',
    'team.php'                  => 'team.php',
    'pricing'                   => 'pricing.php',
    'pricing.php'               => 'pricing.php',
    'tarife'                    => 'tarife.php',
    'tarife.php'                => 'tarife.php',
    'kurse'                     => 'kurse.php',
    'kurse.php'                 => 'kurse.php',
    'classes'                   => 'kurse.php',
    'reviews'                   => 'reviews.php',
    'reviews.php'               => 'reviews.php',
    'press'                     => 'press.php',
    'press.php'                 => 'press.php',
    'pages'                     => 'pages.php',
    'pages.php'                 => 'pages.php',
    'leads'                     => 'leads.php',
    'leads.php'                 => 'leads.php',
    'karriere'                  => 'karriere.php',
    'karriere.php'              => 'karriere.php',
    'onboard'                   => 'onboard.php',
    'onboard.php'               => 'onboard.php',
    'dashboard'                 => 'dashboard.php',
    'dashboard.php'             => 'dashboard.php',
    'bookings'                  => 'bookings.php',
    'bookings.php'              => 'bookings.php',
    'absences'                  => 'absences.php',
    'absences.php'              => 'absences.php',

    // Admin-Endpunkte
    'admin/members'             => 'admin/members.php',
    'admin/members.php'         => 'admin/members.php',
    'admin/users'               => 'admin/users.php',
    'admin/users.php'           => 'admin/users.php',
    'admin/settings'            => 'admin/settings.php',
    'admin/settings.php'        => 'admin/settings.php',
    'admin/bookings'            => 'admin/bookings.php',
    'admin/bookings.php'        => 'admin/bookings.php',
    'admin/finances'            => 'admin/finances.php',
    'admin/finances.php'        => 'admin/finances.php',
    'admin/audit_logs'          => 'admin/audit_logs.php',
    'admin/audit_logs.php'      => 'admin/audit_logs.php',
    'admin/audit-logs'          => 'admin/audit_logs.php',
    'admin/audit-logs.php'      => 'admin/audit_logs.php',
    'admin/tracking'            => 'admin/tracking.php',
    'admin/tracking.php'        => 'admin/tracking.php',
    'admin/coaching'            => 'admin/coaching.php',
    'admin/coaching.php'        => 'admin/coaching.php',
    'admin/requests'            => 'admin/requests.php',
    'admin/requests.php'        => 'admin/requests.php',
    'admin/me'                  => 'admin/me.php',
    'admin/me.php'              => 'admin/me.php',
    'admin/workflow_tasks'      => 'admin/workflow_tasks.php',
    'admin/workflow_tasks.php'  => 'admin/workflow_tasks.php',
    'admin/workflow-tasks'      => 'admin/workflow_tasks.php',
    'admin/workflow-tasks.php'  => 'admin/workflow_tasks.php',
    'admin/smtp'                => 'admin/smtp.php',
    'admin/smtp.php'            => 'admin/smtp.php',
    'admin/integrations'        => 'admin/integrations.php',
    'admin/integrations.php'    => 'admin/integrations.php',
    'admin/convert_lead'        => 'admin/convert_lead.php',
    'admin/convert_lead.php'    => 'admin/convert_lead.php',
    'admin/convert-lead'        => 'admin/convert_lead.php',
    'admin/convert-lead.php'    => 'admin/convert_lead.php',
    'admin/member_notes'        => 'admin/member_notes.php',
    'admin/member_notes.php'    => 'admin/member_notes.php',
    'admin/member-notes'        => 'admin/member_notes.php',
    'admin/member-notes.php'    => 'admin/member_notes.php',
    'admin/page-visibility'     => 'admin/page-visibility.php',
    'admin/page-visibility.php' => 'admin/page-visibility.php',
    'admin/page_visibility'     => 'admin/page-visibility.php',
    'admin/page_visibility.php' => 'admin/page-visibility.php',

    // Admin-Aliase (Frontend nutzt teils diese Pfade)
    'admin/team'                => 'team.php',
    'admin/team.php'            => 'team.php',
    'admin/reviews'             => 'reviews.php',
    'admin/reviews.php'         => 'reviews.php',
    'admin/press'               => 'press.php',
    'admin/press.php'           => 'press.php',
    'admin/karriere'            => 'karriere.php',
    'admin/karriere.php'        => 'karriere.php',
    'admin/leads'               => 'leads.php',
    'admin/leads.php'           => 'leads.php',
    'admin/tarife'              => 'tarife.php',
    'admin/tarife.php'          => 'tarife.php',
    'admin/kurse'               => 'kurse.php',
    'admin/kurse.php'           => 'kurse.php',
    'admin/pages'               => 'pages.php',
    'admin/pages.php'           => 'pages.php',
    'admin/seiten'              => 'pages.php',
    'admin/seiten.php'          => 'pages.php',
    'admin/absences'            => 'absences.php',
    'admin/absences.php'        => 'absences.php',

    // Member-Endpunkte
    'member/profile'            => 'member/profile.php',
    'member/profile.php'        => 'member/profile.php',
    'member/book'               => 'member/book.php',
    'member/book.php'           => 'member/book.php',
    'member/bookings'           => 'member/bookings.php',
    'member/bookings.php'       => 'member/bookings.php',
    'member/checkin'            => 'member/checkin.php',
    'member/checkin.php'        => 'member/checkin.php',
    'member/coaching'           => 'member/coaching.php',
    'member/coaching.php'       => 'member/coaching.php',
    'member/contracts'          => 'member/contracts.php',
    'member/contracts.php'      => 'member/contracts.php',
    'member/sepa'               => 'member/sepa.php',
    'member/sepa.php'           => 'member/sepa.php',
    'member/sessions'           => 'member/sessions.php',
    'member/sessions.php'       => 'member/sessions.php',
    'member/stats'              => 'member/stats.php',
    'member/stats.php'          => 'member/stats.php',
    'member/tracking'           => 'member/tracking.php',
    'member/tracking.php'       => 'member/tracking.php',
    'member/upload'             => 'member/upload.php',
    'member/upload.php'         => 'member/upload.php',

    // Cron-Jobs (geschützt via CRON_SECRET in den Dateien)
    'cron/fetch-reviews'        => 'cron/fetch-reviews.php',
    'cron/fetch-reviews.php'    => 'cron/fetch-reviews.php',
    'cron/gdpr-cleanup'         => 'cron/gdpr-cleanup.php',
    'cron/gdpr-cleanup.php'     => 'cron/gdpr-cleanup.php',
];

// ── Exakter Route-Match ───────────────────────────────────────────────────────
if (array_key_exists($path, $routes)) {
    $target = $routes[$path];

    if ($target === '__health__') {
        http_response_code(200);
        echo json_encode([
            'status'  => 'ok',
            'api'     => 'Nice Athletic Club API',
            'version' => '1.0.0',
            'time'    => date('c'),
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $file = __DIR__ . '/' . $target;
    if (file_exists($file)) {
        // CWD auf das Verzeichnis der Sub-Datei setzen, damit
        // relative require_once '../config.php' korrekt aufgelöst werden.
        // (PHP löst '../' relativ zum CWD auf, nicht relativ zur Datei.)
        chdir(dirname($file));
        require $file;
        exit();
    }

    http_response_code(500);
    echo json_encode(['error' => 'Endpoint-Datei fehlt: ' . $target]);
    exit();
}

// ── Dynamische Pfade mit ID-Segment ──────────────────────────────────────────
// z.B. /api/admin/members/42  →  admin/members.php  mit $_GET['id'] = '42'
$parts = explode('/', $path);
if (count($parts) >= 2) {
    $lastSegment = array_pop($parts);
    $basePart    = implode('/', $parts);

    if (array_key_exists($basePart, $routes) && $routes[$basePart] !== '__health__') {
        $_GET['id']           = $lastSegment;
        $_SERVER['PATH_INFO'] = '/' . $lastSegment;

        $file = __DIR__ . '/' . $routes[$basePart];
        if (file_exists($file)) {
            chdir(dirname($file)); // CWD-Fix auch für ID-Routen
            require $file;
            exit();
        }
    }
}

// ── 404 – Kein passendes Route gefunden ──────────────────────────────────────
http_response_code(404);
echo json_encode([
    'error' => 'API-Endpoint nicht gefunden.',
    'path'  => '/' . $path,
    'hint'  => 'Verfuegbare Endpunkte: GET /api/health, POST /api/auth/login, GET /api/team ...',
], JSON_UNESCAPED_UNICODE);
exit();
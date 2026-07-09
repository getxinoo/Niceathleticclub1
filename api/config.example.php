<?php
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  config.example.php — CANONICAL TEMPLATE (safe to commit, contains NO secrets)
 * ═══════════════════════════════════════════════════════════════════════════
 *  The real api/config.php lives ONLY on the production server and is
 *  git-ignored (see SECURITY_REMEDIATION_PLAN.md). To (re)create it:
 *    1. Copy this file to config.php ON THE SERVER (never commit it).
 *    2. Replace every REPLACE__* placeholder with a real value.
 *    3. Generate secrets:  php -r "echo bin2hex(random_bytes(48));"
 *  Required values: DB_HOST, DB_NAME, DB_USER, DB_PASS, TOKEN_SECRET,
 *  MASTER_ADMIN_EMAIL/PASS (bootstrap only), GOOGLE_PLACES_API_KEY,
 *  GOOGLE_PLACE_ID, CRON_SECRET, SEPA_AES_KEY (before SEPA use).
 *  After first real admin exists: set MASTER_BOOTSTRAP_DISABLED = true.
 */
/**
 * config.php – Zentrale API-Konfiguration
 * ─────────────────────────────────────────────────────────────────────────────
 * Enthält DB-Zugangsdaten, CORS-Setup, PDO-Factory, Response-Helfer
 * und JWT-Token-Funktionen (Sprint 8).
 
 * DEPLOYMENT auf Checkdomain:
 * 1. DB_* Konstanten auf die echten Zugangsdaten aus dem Checkdomain-Panel setzen.
 * 2. TOKEN_SECRET auf einen langen zufälligen String setzen (min. 64 Zeichen).
 * 3. MASTER_ADMIN_PASS SOFORT nach erstem Login in der users-Tabelle ersetzen!
 * 4. Diese Datei liegt im /api/ Ordner – die .htaccess verhindert direkten Zugriff.
 *
 * TOKEN_SECRET generieren:
 * php -r "echo bin2hex(random_bytes(48));"
 */

// ── Datenbank ─────────────────────────────────────────────────────────────────
define('DB_HOST',    'REPLACE__DB_HOST');
define('DB_NAME',    'REPLACE__DB_NAME');
define('DB_USER',    'REPLACE__DB_USER');
define('DB_PASS',    'REPLACE__DB_PASS');
define('DB_CHARSET', 'utf8mb4');

// ── JWT-Token ────────────────────────────────────────────────────────────────
// WICHTIG: Durch einen langen, zufälligen String ersetzen!
define('TOKEN_SECRET',  'REPLACE__TOKEN_SECRET__MIN_64_RANDOM_CHARS');
define('TOKEN_EXPIRY',  60 * 60 * 24 * 30);  // 30 Tage in Sekunden

// ── Master-Admin Bootstrap ────────────────────────────────────────────────────
// Wird NUR verwendet, wenn die users-Tabelle leer ist (Ersteinrichtung).
// SOFORT nach dem ersten erfolgreichen Login einen echten User anlegen!
define('MASTER_ADMIN_EMAIL', 'REPLACE__ADMIN_EMAIL');
define('MASTER_ADMIN_PASS',  'REPLACE__STRONG_BOOTSTRAP_PASSWORD');   // ← Für Produktion ändern!

// ── Google Places API (Reviews) ──────────────────────────────────────────────
// 1. Google Cloud Console → "Places API" aktivieren
// 2. API-Key erstellen (Server-Key, IP-Restriction auf Checkdomain-Server-IP)
// 3. Place ID ermitteln: https://developers.google.com/maps/documentation/places/web-service/place-id-finder
//    → NAC Göppingen suchen → Place ID kopieren
// 4. Am Donnerstag hier eintragen:
define('GOOGLE_PLACES_API_KEY', 'REPLACE__GOOGLE_PLACES_API_KEY');
define('GOOGLE_PLACE_ID',       'REPLACE__GOOGLE_PLACE_ID');  // Place ID des NAC Göppingen

// ── Cron-Secret für automatische Sync-Aufrufe ────────────────────────────────
// Damit der Cronjob ohne Admin-JWT aufgerufen werden kann.
// Generieren: php -r "echo bin2hex(random_bytes(24));"
define('CRON_SECRET', 'REPLACE__CRON_SECRET');  // ← Für Produktion ändern!

// ── CORS ──────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// ── JSON Content-Type fuer alle API-Responses ─────────────────────────────────
header('Content-Type: application/json; charset=utf-8');

// ── PDO Factory (Singleton) ───────────────────────────────────────────────────
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_TIMEOUT            => 5,
        ]);
    } catch (PDOException $e) {
        http_response_code(503);
        echo json_encode(['error' => 'Datenbankverbindung nicht verfügbar.']);
        exit();
    }

    return $pdo;
}

// ── Response Helpers ──────────────────────────────────────────────────────────
function json_success($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit();
}

function json_error(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit();
}

function get_body(): array
{
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        json_error('Ungültiger JSON-Body: ' . json_last_error_msg());
    }
    return $data ?? [];
}

// ── JWT-Token Funktionen ──────────────────────────────────────────────────────

/**
 * Kodiert Daten als Base64URL (URL-safe, kein Padding).
 */
function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Dekodiert einen Base64URL-String.
 */
function base64url_decode(string $data): string
{
    // Padding wiederherstellen
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Erstellt einen signierten JWT-Token (HS256).
 *
 * Payload enthält:
 * sub   → User-ID
 * name  → Anzeigename
 * email → E-Mail
 * role  → 'admin' | 'member'
 * iat   → Issued At (Unix-Timestamp)
 * exp   → Expiry (Unix-Timestamp)
 */
function create_token(array $payload): string
{
    $header    = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload   = base64url_encode(json_encode($payload));
    $signature = base64url_encode(
        hash_hmac('sha256', "{$header}.{$payload}", TOKEN_SECRET, true)
    );
    return "{$header}.{$payload}.{$signature}";
}

/**
 * Verifiziert einen JWT-Token. Gibt das dekodierte Payload-Array zurück
 * oder null bei ungültigem/abgelaufenem Token.
 *
 * @param string $token  Das Bearer-Token (ohne "Bearer " Prefix)
 * @return array<string,mixed>|null
 */
function verify_token(string $token)
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    $header    = $parts[0];
    $payload   = $parts[1];
    $signature = $parts[2];

    // Signatur prüfen (timing-safe)
    $expected = base64url_encode(
        hash_hmac('sha256', "{$header}.{$payload}", TOKEN_SECRET, true)
    );
    if (!hash_equals($expected, $signature)) return null;

    // Payload dekodieren
    $data = json_decode(base64url_decode($payload), true);
    if (!is_array($data)) return null;

    // Ablauf prüfen
    if (isset($data['exp']) && $data['exp'] < time()) {
        return null;  // Token abgelaufen
    }

    return $data;
}

/**
 * Liest den Bearer-Token aus dem Authorization-Header und verifiziert ihn.
 * Beendet die Ausführung mit 401, wenn kein gültiger Token vorhanden ist.
 *
 * @return array<string,mixed>  Das verifizierte Token-Payload
 */
function require_auth(): array
{
    // Checkdomain CGI/FastCGI: Authorization-Header kann in verschiedenen
    // $_SERVER-Variablen landen – alle Fallbacks prüfen
    $auth = $_SERVER['HTTP_AUTHORIZATION']
         ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
         ?? '';

    // Letzter Fallback: getallheaders() (funktioniert auf manchen CGI-Setups)
    if (empty($auth) && function_exists('getallheaders')) {
        $headers = getallheaders();
        // Header-Keys können case-insensitive sein
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $auth = $value;
                break;
            }
        }
    }

    // Noch ein Fallback: apache_request_headers()
    if (empty($auth) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $auth = $value;
                break;
            }
        }
    }

    if (strpos($auth, 'Bearer ') !== 0) {
        json_error('Nicht autorisiert. Bitte anmelden.', 401);
    }

    $token   = substr($auth, 7);
    $payload = verify_token($token);

    if ($payload === null) {
        json_error('Token ungültig oder abgelaufen. Bitte erneut anmelden.', 401);
    }

    return $payload;
}

/**
 * Wie require_auth(), aber prüft zusätzlich ob die Rolle 'admin' ist.
 */
function require_admin(): array
{
    $payload = require_auth();
    if (($payload['role'] ?? '') !== 'admin') {
        json_error('Zugriff verweigert. Admin-Rechte erforderlich.', 403);
    }
    return $payload;
}

// ── SEPA Encryption Key ──────────────────────────────────────────────────────
// Generieren: php -r "echo bin2hex(random_bytes(32));"
// WICHTIG: Vor SEPA-Nutzung hier einen echten 64-Hex-Zeichen Key eintragen!
define('SEPA_AES_KEY', 'REPLACE__SEPA_AES_KEY__64_HEX_CHARS');

// ── Master-Admin Bootstrap Kontrolle ─────────────────────────────────────────
// Auf true setzen nachdem der erste echte Admin-User angelegt wurde.
// Danach ist der Master-Admin-Login deaktiviert.
define('MASTER_BOOTSTRAP_DISABLED', false);

// ── P0: Erweiterte Rollen- und Permission-Helpers ────────────────────────────

/**
 * Staff-Rollen die Zugang zum Admin-Panel haben.
 */
define('STAFF_ROLES', ['admin', 'hr', 'finance', 'trainer', 'frontdesk']);

/**
 * Prüft ob der User eine Staff-Rolle hat (nicht member).
 * Beendet mit 403 wenn nicht.
 *
 * @return array Token-Payload
 */
function require_staff(): array
{
    $payload = require_auth();
    $role = $payload['role'] ?? '';
    if (!in_array($role, STAFF_ROLES, true)) {
        json_error('Zugriff verweigert. Staff-Berechtigung erforderlich.', 403);
    }
    return $payload;
}

/**
 * Prüft ob der User eine der angegebenen Rollen hat.
 *
 * @param string[] $roles  z.B. ['admin', 'finance']
 * @return array Token-Payload
 */
function require_staff_roles(array $roles): array
{
    $payload = require_auth();
    $role = $payload['role'] ?? '';
    if (!in_array($role, $roles, true)) {
        json_error('Zugriff verweigert. Benötigte Rolle: ' . implode(', ', $roles), 403);
    }
    return $payload;
}

/**
 * Prüft ob der User eine bestimmte Permission hat.
 * Logik: role_permissions UNION user_permissions (granted=1) MINUS user_permissions (granted=0)
 * Admin hat immer alle Permissions.
 *
 * @param string $permissionKey  z.B. 'members.write'
 * @return array Token-Payload
 */
function require_permission(string $permissionKey): array
{
    $payload = require_auth();
    $role    = $payload['role'] ?? '';
    $userId  = (int)($payload['sub'] ?? 0);

    // Admin hat immer alle Rechte
    if ($role === 'admin') return $payload;

    // Prüfe effective_permissions aus dem Token (wenn vorhanden)
    if (!empty($payload['permissions']) && is_array($payload['permissions'])) {
        if (in_array($permissionKey, $payload['permissions'], true)) {
            return $payload;
        }
        json_error("Fehlende Berechtigung: {$permissionKey}", 403);
    }

    // Fallback: DB-Lookup
    $pdo = db();

    // 1. Rollen-Permission
    $stmt = $pdo->prepare(
        "SELECT 1 FROM role_permissions WHERE role = ? AND permission_key = ? LIMIT 1"
    );
    $stmt->execute([$role, $permissionKey]);
    $hasRolePerm = (bool)$stmt->fetchColumn();

    // 2. User-spezifische Overrides
    $stmt = $pdo->prepare(
        "SELECT granted FROM user_permissions WHERE user_id = ? AND permission_key = ? LIMIT 1"
    );
    $stmt->execute([$userId, $permissionKey]);
    $userOverride = $stmt->fetchColumn();

    // Override gewinnt über Rollen-Permission
    if ($userOverride !== false) {
        if ((int)$userOverride === 1) return $payload;
        if ((int)$userOverride === 0) {
            json_error("Berechtigung entzogen: {$permissionKey}", 403);
        }
    }

    if ($hasRolePerm) return $payload;

    json_error("Fehlende Berechtigung: {$permissionKey}", 403);
}

/**
 * Lädt alle effektiven Permissions für einen User (für Token-Payload).
 * Rollen-Permissions + User-Grants - User-Revokes.
 *
 * @param string $role    z.B. 'trainer'
 * @param int    $userId  User-ID
 * @return string[]       Array von permission_keys
 */
function get_effective_permissions(string $role, int $userId): array
{
    $pdo = db();

    // Rollen-Permissions
    $stmt = $pdo->prepare(
        "SELECT permission_key FROM role_permissions WHERE role = ?"
    );
    $stmt->execute([$role]);
    $perms = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // User-spezifische Overrides
    $stmt = $pdo->prepare(
        "SELECT permission_key, granted FROM user_permissions WHERE user_id = ?"
    );
    $stmt->execute([$userId]);
    $overrides = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    // Apply overrides
    foreach ($overrides as $key => $granted) {
        if ((int)$granted === 1 && !in_array($key, $perms, true)) {
            $perms[] = $key;
        }
        if ((int)$granted === 0) {
            $perms = array_values(array_filter($perms, fn($p) => $p !== $key));
        }
    }

    return $perms;
}

// ── Zentraler DSGVO-Audit-Log Helper ─────────────────────────────────────────

/**
 * Schreibt einen vollständigen, DSGVO-konformen Audit-Log-Eintrag.
 *
 * Alle lokalen log_audit / _log_audit / log_audit_member Funktionen in den
 * einzelnen Endpoints sollen durch diesen zentralen Helper ersetzt werden.
 *
 * Features:
 *  - UUID wird automatisch aus der users-Tabelle geladen (aus JWT sub)
 *  - IP-Adresse wird gesetzt (DSGVO: Cron löscht nach 90 Tagen)
 *  - User-Agent, Session-ID (Fingerprint aus sub+iat) werden gesetzt
 *  - actor_type wird aus der Rolle abgeleitet
 *  - Fehler werden geloggt, unterbrechen aber NIE den Hauptprozess
 *
 * @param array          $actor        JWT-Payload (aus require_auth() etc.)
 * @param string         $action       z.B. 'CREATE_MEMBER', 'DELETE_INVOICE'
 * @param string         $entity_type  z.B. 'member', 'invoice', 'user'
 * @param string|int     $entity_id    ID des betroffenen Datensatzes
 * @param array          $details      Optionale Zusatzdaten (→ JSON)
 * @param string         $severity     'info' | 'warning' | 'critical'
 * @param string         $source       'admin_ui' | 'member_ui' | 'cron' | 'system' | 'api'
 */
function audit_log(
    array $actor,
    string $action,
    string $entity_type,
    $entity_id,
    array $details = [],
    string $severity = 'info',
    string $source = 'admin_ui'
): void {
    try {
        $pdo     = db();
        $user_id = (int)($actor['sub'] ?? $actor['id'] ?? 0);
        $role    = (string)($actor['role'] ?? '');

        // Actor-Typ aus Rolle ableiten
        $actor_type = 'api';
        if ($role === 'admin') {
            $actor_type = 'admin';
        } elseif (in_array($role, ['hr', 'finance', 'trainer', 'frontdesk'], true)) {
            $actor_type = 'staff';
        } elseif ($role === 'member') {
            $actor_type = 'member';
        } elseif ($role === 'cron') {
            $actor_type = 'cron';
        } elseif ($role === 'system') {
            $actor_type = 'system';
        }

        // UUID des Actors aus users-Tabelle laden (falls nicht im Token)
        $actor_uuid = (string)($actor['uuid'] ?? '');
        if ($actor_uuid === '' && $user_id > 0) {
            try {
                $s = $pdo->prepare("SELECT uuid FROM users WHERE id = ? LIMIT 1");
                $s->execute([$user_id]);
                $actor_uuid = (string)($s->fetchColumn() ?: '');
            } catch (\Throwable $ignored) {}
        }

        // User-Name
        $user_name = null;
        if (!empty($actor['name'])) {
            $user_name = (string)$actor['name'];
        } elseif (!empty($actor['email'])) {
            $user_name = (string)$actor['email'];
        }

        // IP-Adresse (DSGVO: wird via Cron nach 90 Tagen auf NULL gesetzt)
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['HTTP_X_REAL_IP']
            ?? $_SERVER['REMOTE_ADDR']
            ?? null;
        // Erste IP bei Proxy-Chains
        if ($ip !== null && strpos($ip, ',') !== false) {
            $ip = trim(explode(',', $ip)[0]);
        }

        // User-Agent kürzen
        $ua = isset($_SERVER['HTTP_USER_AGENT'])
            ? mb_substr($_SERVER['HTTP_USER_AGENT'], 0, 512)
            : null;

        // Session-ID: deterministischer Fingerprint (sub + iat)
        $session_id = null;
        if ($user_id > 0 && isset($actor['iat'])) {
            $session_id = substr(hash('sha256', $user_id . '_' . $actor['iat']), 0, 32);
        }

        $pdo->prepare("
            INSERT INTO audit_logs
                (uuid, user_id, user_name, actor_type, actor_role, source,
                 action, entity_type, entity_id, details, severity,
                 ip_address, user_agent, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $actor_uuid,
            $user_id ?: null,
            $user_name,
            $actor_type,
            $role ?: null,
            $source,
            $action,
            $entity_type,
            (string)$entity_id,
            json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $severity,
            $ip,
            $ua,
            $session_id,
        ]);
    } catch (\Throwable $e) {
        // Audit-Fehler NIEMALS den Hauptprozess abbrechen lassen!
        error_log('[NAC_AUDIT_ERROR] ' . $e->getMessage());
    }
}
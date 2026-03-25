<?php
/**
 * team.php – Team-Profile API (Frontend Team-Seite)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/team.php           → Alle sichtbaren Team-Mitglieder (public)
 * GET    /api/team.php?all=1     → Alle Team-Mitglieder inkl. versteckte (admin)
 * GET    /api/team.php?id=1      → Einzelnes Profil
 * POST   /api/team.php           → Neues Profil anlegen (admin)
 * PATCH  /api/team.php?id=1      → Profil aktualisieren (admin)
 * DELETE /api/team.php?id=1      → Profil loeschen (admin)
 */

declare(strict_types=1);
require_once 'config.php';

$method  = $_SERVER['REQUEST_METHOD'];
$id      = isset($_GET['id']) ? (int) $_GET['id'] : null;
$showAll = isset($_GET['all']) && $_GET['all'] === '1';

/**
 * Audit-Log Helfer
 */
function log_team_audit(string $action, $entity_id, array $details = []): void {
    try {
        $user = require_auth();
        $userId = $user['id'] ?? $user['sub'] ?? 0;
        $stmt = db()->prepare(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES (?, ?, 'team_profile', ?, ?)"
        );
        $stmt->execute([$userId, $action, $entity_id, json_encode($details)]);
    } catch (Exception $e) {
        // Audit-Fehler still ignorieren
    }
}

switch ($method) {
    case 'GET':
        if ($id !== null) {
            get_profile($id);
        } else {
            list_profiles($showAll);
        }
        break;

    case 'POST':
        require_auth();
        create_profile();
        break;

    case 'PATCH':
        require_auth();
        if ($id === null) json_error('Parameter "id" fehlt.');
        update_profile($id);
        break;

    case 'DELETE':
        require_auth();
        if ($id === null) json_error('Parameter "id" fehlt.');
        delete_profile($id);
        break;

    default:
        json_error('Methode nicht erlaubt.', 405);
}

// ── Handler: Liste ────────────────────────────────────────────────────────────
function list_profiles(bool $showAll): void
{
    if ($showAll) {
        // Admin: alle Profile (auth erforderlich)
        try { require_auth(); } catch (Exception $e) {
            json_error('Authentifizierung erforderlich.', 401);
            return;
        }
        $sql = "SELECT * FROM team_profiles ORDER BY sort_order ASC, id ASC";
    } else {
        // Public: nur sichtbare
        $sql = "SELECT * FROM team_profiles WHERE visible = 1 ORDER BY sort_order ASC, id ASC";
    }

    $stmt = db()->query($sql);
    $profiles = $stmt->fetchAll();
    json_success(array_map('normalize_profile', $profiles));
}

// ── Handler: Einzelnes Profil ─────────────────────────────────────────────────
function get_profile(int $id): void
{
    $stmt = db()->prepare('SELECT * FROM team_profiles WHERE id = ?');
    $stmt->execute([$id]);
    $profile = $stmt->fetch();

    if (!$profile) {
        json_error('Profil nicht gefunden.', 404);
    }

    json_success(normalize_profile($profile));
}

// ── Handler: Profil anlegen ───────────────────────────────────────────────────
function create_profile(): void
{
    $body = get_body();

    // Pflichtfelder
    foreach (['first_name', 'last_name', 'position'] as $field) {
        if (empty(trim((string)($body[$field] ?? '')))) {
            json_error("Pflichtfeld '{$field}' fehlt.");
        }
    }

    // Slug generieren
    $slug = $body['slug'] ?? strtolower(
        preg_replace('/[^a-z0-9]+/', '-',
            strtolower(trim($body['first_name']) . '-' . trim($body['last_name']))
        )
    );

    // Slug-Kollision pruefen
    $chk = db()->prepare('SELECT id FROM team_profiles WHERE slug = ?');
    $chk->execute([$slug]);
    if ($chk->fetch()) {
        $slug .= '-' . time();
    }

    $stmt = db()->prepare(
        'INSERT INTO team_profiles 
         (slug, first_name, last_name, position, type, profile_image, detail_image, bio, meta_bio, specialties, certifications, instagram, facebook, linkedin, tiktok, snapchat, visible, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $stmt->execute([
        $slug,
        trim((string)$body['first_name']),
        trim((string)$body['last_name']),
        trim((string)$body['position']),
        in_array($body['type'] ?? '', ['leadership', 'coach']) ? $body['type'] : 'coach',
        trim((string)($body['profile_image'] ?? '')),
        trim((string)($body['detail_image'] ?? '')),
        mb_substr(trim((string)($body['bio'] ?? '')), 0, 800),
        trim((string)($body['meta_bio'] ?? '')),
        json_encode($body['specialties'] ?? []),
        json_encode($body['certifications'] ?? []),
        trim((string)($body['instagram'] ?? '')),
        trim((string)($body['facebook'] ?? '')),
        trim((string)($body['linkedin'] ?? '')),
        trim((string)($body['tiktok'] ?? '')),
        trim((string)($body['snapchat'] ?? '')),
        isset($body['visible']) ? ($body['visible'] ? 1 : 0) : 1,
        isset($body['sort_order']) ? (int)$body['sort_order'] : 0,
    ]);

    $new_id = (int)db()->lastInsertId();
    log_team_audit('CREATE_TEAM_PROFILE', $new_id, $body);

    $stmt2 = db()->prepare('SELECT * FROM team_profiles WHERE id = ?');
    $stmt2->execute([$new_id]);
    json_success(normalize_profile($stmt2->fetch()), 201);
}

// ── Handler: Profil aktualisieren ─────────────────────────────────────────────
function update_profile(int $id): void
{
    $body = get_body();
    $allowed = [
        'user_id', 'slug', 'first_name', 'last_name', 'position', 'type',
        'profile_image', 'detail_image', 'bio', 'meta_bio',
        'specialties', 'certifications',
        'instagram', 'facebook', 'linkedin', 'tiktok', 'snapchat',
        'visible', 'sort_order'
    ];

    $fields = [];
    $values = [];

    foreach ($allowed as $field) {
        if (!array_key_exists($field, $body)) continue;

        if ($field === 'visible') {
            $values[] = $body[$field] ? 1 : 0;
        } elseif ($field === 'sort_order') {
            $values[] = (int)$body[$field];
        } elseif ($field === 'user_id') {
            $values[] = !empty($body[$field]) ? (int)$body[$field] : null;
        } elseif ($field === 'specialties' || $field === 'certifications') {
            $values[] = json_encode($body[$field] ?? []);
        } elseif ($field === 'bio') {
            $values[] = mb_substr(trim((string)$body[$field]), 0, 800);
        } else {
            $values[] = trim((string)$body[$field]);
        }
        $fields[] = "{$field} = ?";
    }

    if (empty($fields)) {
        json_error('Keine Aenderungen uebergeben.');
    }

    $values[] = $id;
    $stmt = db()->prepare('UPDATE team_profiles SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    log_team_audit('UPDATE_TEAM_PROFILE', $id, $body);

    $stmt2 = db()->prepare('SELECT * FROM team_profiles WHERE id = ?');
    $stmt2->execute([$id]);
    $profile = $stmt2->fetch();

    if (!$profile) json_error('Profil nicht gefunden.', 404);
    json_success(normalize_profile($profile));
}

// ── Handler: Profil loeschen ──────────────────────────────────────────────────
function delete_profile(int $id): void
{
    $stmt_check = db()->prepare('SELECT first_name, last_name FROM team_profiles WHERE id = ?');
    $stmt_check->execute([$id]);
    $profile = $stmt_check->fetch();

    if (!$profile) json_error('Profil nicht gefunden.', 404);

    $stmt = db()->prepare('DELETE FROM team_profiles WHERE id = ?');
    $stmt->execute([$id]);

    log_team_audit('DELETE_TEAM_PROFILE', $id, [
        'name' => $profile['first_name'] . ' ' . $profile['last_name']
    ]);

    http_response_code(204);
    exit();
}

// ── Hilfsfunktion: DB-Zeile → API-Objekt ─────────────────────────────────────
function normalize_profile(array $p): array
{
    $specialties    = is_string($p['specialties'] ?? null)    ? json_decode($p['specialties'], true)    : ($p['specialties'] ?? []);
    $certifications = is_string($p['certifications'] ?? null) ? json_decode($p['certifications'], true) : ($p['certifications'] ?? []);

    return [
        'id'             => (string)$p['id'],
        'user_id'        => isset($p['user_id']) ? (int)$p['user_id'] : null,
        'slug'           => $p['slug'],
        'name'           => $p['first_name'] . ' ' . $p['last_name'],
        'first_name'     => $p['first_name'],
        'last_name'      => $p['last_name'],
        'position'       => $p['position'],
        'role'           => $p['position'], // Alias fuer Frontend-Kompatibilitaet
        'type'           => $p['type'],
        'profile_image'  => $p['profile_image'] ?: null,
        'detail_image'   => $p['detail_image'] ?: null,
        'image'          => $p['profile_image'] ?: $p['detail_image'] ?: null, // Alias
        'bio'            => $p['bio'] ?: '',
        'meta_bio'       => $p['meta_bio'] ?: '',
        'specialties'    => is_array($specialties) ? $specialties : [],
        'certifications' => is_array($certifications) ? $certifications : [],
        'instagram'      => $p['instagram'] ?: '',
        'facebook'       => $p['facebook'] ?: '',
        'linkedin'       => $p['linkedin'] ?: '',
        'tiktok'         => $p['tiktok'] ?: '',
        'snapchat'       => $p['snapchat'] ?: '',
        'visible'        => (bool)$p['visible'],
        'sort_order'     => (int)$p['sort_order'],
    ];
}
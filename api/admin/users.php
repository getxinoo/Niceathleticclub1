<?php
/**
 * api/admin/users.php - Enterprise Team & Rechte Verwaltung
 */
require_once '../config.php';

// ── Globaler Error-Handler: Jeder PHP-Fehler wird JSON ──────────────────────
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    _handle_users_request();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Interner Server-Fehler in users.php',
        'debug' => $e->getMessage(),
        'file'  => basename($e->getFile()) . ':' . $e->getLine(),
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

function _handle_users_request(): void
{
    $admin = require_auth();
    if (!in_array($admin['role'] ?? '', ['admin', 'hr'], true)) {
        json_error('Nicht autorisiert', 403);
    }

    // Normalize: JWT hat 'sub' statt 'id'
    if (!isset($admin['id'])) $admin['id'] = $admin['sub'] ?? 0;

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? null;
    $db = db();

    // ══════════════════════════════════════════════════════════════════════
    // GET
    // ══════════════════════════════════════════════════════════════════════
    if ($method === 'GET') {

        // ── Detail: User + team_profile + syncStatus ─────────────────────
        if ($action === 'detail' && isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            $user = _load_user_safe($db, $id);
            if (!$user) json_error('User nicht gefunden.', 404);

            $user['permissions'] = _load_permissions_safe($db, $user);

            // Load linked team_profile
            $profile = null;
            try {
                $stmt2 = $db->prepare("SELECT * FROM team_profiles WHERE user_id = ? LIMIT 1");
                $stmt2->execute([$id]);
                $profile = $stmt2->fetch();
            } catch (Throwable $e) { /* team_profiles might not be ready */ }

            if ($profile) {
                $profile['specialties']    = is_string($profile['specialties'] ?? null)    ? json_decode($profile['specialties'], true)    : ($profile['specialties'] ?? []);
                $profile['certifications'] = is_string($profile['certifications'] ?? null) ? json_decode($profile['certifications'], true) : ($profile['certifications'] ?? []);
                $profile['visible']    = (bool)($profile['visible'] ?? false);
                $profile['sort_order'] = (int)($profile['sort_order'] ?? 0);
            }

            // Check legacy team_members
            $legacyMember = null;
            try {
                $stmt4 = $db->prepare("SELECT * FROM team_members WHERE user_id = ? OR (LOWER(name) LIKE CONCAT('%', LOWER(?), '%')) LIMIT 1");
                $stmt4->execute([$id, trim((string)($user['first_name'] ?? ''))]);
                $legacyMember = $stmt4->fetch();
            } catch (Throwable $e) { /* table might not exist */ }

            // Build sync status
            $mismatches = [];
            if ($profile) {
                if (strtolower(trim((string)($profile['first_name'] ?? ''))) !== strtolower(trim((string)($user['first_name'] ?? '')))) {
                    $mismatches[] = 'first_name';
                }
                if (strtolower(trim((string)($profile['last_name'] ?? ''))) !== strtolower(trim((string)($user['last_name'] ?? '')))) {
                    $mismatches[] = 'last_name';
                }
            }

            json_success([
                'user'             => $user,
                'teamProfile'      => $profile ?: null,
                'legacyTeamMember' => $legacyMember ?: null,
                'syncStatus'       => [
                    'profile_exists' => (bool)$profile,
                    'legacy_exists'  => (bool)$legacyMember,
                    'mismatches'     => $mismatches,
                ],
            ]);
        }

        // ── Default: List all staff ──────────────────────────────────────
        $stmt = _query_staff_list($db);
        $rows = $stmt->fetchAll();

        $users = array_map(function($u) use ($db) {
            $u['permissions'] = _load_role_permissions_safe($db, (string)($u['role'] ?? ''), (int)($u['id'] ?? 0));
            return $u;
        }, $rows);

        json_success($users);
    }

    // ══════════════════════════════════════════════════════════════════════
    // POST
    // ══════════════════════════════════════════════════════════════════════
    if ($method === 'POST') {
        $body = get_body();
        $first_name = (string)($body['first_name'] ?? '');
        $last_name  = (string)($body['last_name'] ?? '');
        $full_name  = trim($first_name . ' ' . $last_name) ?: ((string)($body['name'] ?? 'Unbekannt'));
        $dob = $body['birth_date'] ?? $body['date_of_birth'] ?? null;

        // ── Create ──────────────────────────────────────────────────────
        if ($action === 'create') {
            $staff_number = !empty($body['staff_number']) ? $body['staff_number'] : _generate_staff_number($db);
            $member_id = !empty($body['member_id']) ? (int)$body['member_id'] : null;
            $password = !empty($body['password']) ? $body['password'] : bin2hex(random_bytes(8));
            $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $perms = isset($body['permissions']) ? json_encode($body['permissions']) : '[]';
            $source       = (string)($body['source'] ?? 'manual');
            $applicant_id = !empty($body['applicant_id']) ? (int)$body['applicant_id'] : null;
            $hired_at     = ($source === 'onboarding') ? date('Y-m-d H:i:s') : null;

            try {
                $cols = [];
                $vals = [];
                $params = [];

                $cols[] = 'name';          $vals[] = '?'; $params[] = $full_name;
                $cols[] = 'email';         $vals[] = '?'; $params[] = (string)($body['email'] ?? '');
                $cols[] = 'password_hash'; $vals[] = '?'; $params[] = $hash;
                $cols[] = 'role';          $vals[] = '?'; $params[] = (string)($body['role'] ?? 'trainer');
                $cols[] = 'active';        $vals[] = '?'; $params[] = 1;

                $optionalCols = [
                    'staff_number'  => $staff_number,
                    'first_name'    => $first_name,
                    'last_name'     => $last_name,
                    'phone'         => $body['phone'] ?? null,
                    'date_of_birth' => $dob,
                    'permissions'   => $perms,
                    'member_id'     => $member_id,
                    'location_id'   => $body['location_id'] ?? 1,
                    'source'        => $source,
                    'applicant_id'  => $applicant_id,
                    'hired_at'      => $hired_at,
                ];

                $existingCols = _get_table_columns($db, 'users');
                foreach ($optionalCols as $col => $val) {
                    if (in_array($col, $existingCols, true)) {
                        $cols[] = $col;
                        $vals[] = '?';
                        $params[] = $val;
                    }
                }

                $sql = "INSERT INTO users (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $vals) . ")";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            } catch (Throwable $e) {
                json_error('User konnte nicht erstellt werden: ' . $e->getMessage(), 500);
            }

            $new_user_id = (int)$db->lastInsertId();

            if ($applicant_id) {
                try {
                    $db->prepare("UPDATE career_applicants SET status = 'eingestellt', onboarded_user_id = ? WHERE id = ?")
                        ->execute([$new_user_id, $applicant_id]);
                } catch (Throwable $e) { /* ignore */ }
            }

            try { _log_audit($admin, 'CREATE_STAFF', 'user', $new_user_id, ['role' => $body['role'] ?? '', 'source' => $source]); } catch (Throwable $e) {}

            json_success([
                'success'       => true,
                'id'            => $new_user_id,
                'staff_number'  => $staff_number,
                'temp_password' => ($source === 'onboarding') ? $password : null,
            ]);
        }

        // ── Update ──────────────────────────────────────────────────────
        if ($action === 'update' && isset($_GET['id'])) {
            $id = (int)$_GET['id'];

            try {
                $stmt = $db->prepare("UPDATE users SET name = ?, first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?, role = ?, active = ? WHERE id = ?");
                $stmt->execute([$full_name, $first_name, $last_name, (string)($body['email'] ?? ''), $body['phone'] ?? null, $dob, (string)($body['role'] ?? 'trainer'), !empty($body['active']) ? 1 : 0, $id]);
            } catch (Throwable $e) {
                // Fallback: minimal update without optional columns
                try {
                    $db->prepare("UPDATE users SET name = ?, email = ?, role = ?, active = ? WHERE id = ?")
                        ->execute([$full_name, (string)($body['email'] ?? ''), (string)($body['role'] ?? 'trainer'), !empty($body['active']) ? 1 : 0, $id]);
                } catch (Throwable $e2) {
                    json_error('Update fehlgeschlagen: ' . $e2->getMessage(), 500);
                }
            }

            // Write user-specific permission overrides
            if (isset($body['permissions']) && is_array($body['permissions'])) {
                try {
                    $rolePermsStmt = $db->prepare("SELECT permission_key FROM role_permissions WHERE role = ?");
                    $rolePermsStmt->execute([(string)($body['role'] ?? '')]);
                    $rolePerms = $rolePermsStmt->fetchAll(PDO::FETCH_COLUMN);

                    $db->prepare("DELETE FROM user_permissions WHERE user_id = ?")->execute([$id]);

                    $insertStmt = $db->prepare("INSERT INTO user_permissions (user_id, permission_key, granted) VALUES (?, ?, ?)");
                    foreach ($body['permissions'] as $perm) {
                        if (!in_array($perm, $rolePerms, true)) {
                            $insertStmt->execute([$id, $perm, 1]);
                        }
                    }
                    foreach ($rolePerms as $rolePerm) {
                        if (!in_array($rolePerm, $body['permissions'], true)) {
                            $insertStmt->execute([$id, $rolePerm, 0]);
                        }
                    }
                } catch (Throwable $e) { /* permission tables might not exist */ }
            }

            if (!empty($body['password'])) {
                try {
                    $hash = password_hash((string)$body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
                    $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $id]);
                } catch (Throwable $e) { /* ignore */ }
            }

            try { _log_audit($admin, 'UPDATE_STAFF', 'user', $id, ['role' => $body['role'] ?? '']); } catch (Throwable $e) {}
            json_success(['success' => true]);
        }

        // ── Status toggle ───────────────────────────────────────────────
        if ($action === 'status' && isset($_GET['id'])) {
            $db->prepare("UPDATE users SET active = ? WHERE id = ?")->execute([!empty($body['active']) ? 1 : 0, (int)$_GET['id']]);
            json_success(['success' => true]);
        }

        // ── Update Profile: Combined users + team_profile save ──────────
        if ($action === 'update_profile' && isset($_GET['id'])) {
            $id = (int)$_GET['id'];

            $checkUser = $db->prepare("SELECT id FROM users WHERE id = ?");
            $checkUser->execute([$id]);
            if (!$checkUser->fetch()) json_error('User nicht gefunden.', 404);

            $userData    = $body['user']        ?? null;
            $profileData = $body['teamProfile'] ?? null;
            $existingProfile = null;

            // 1. Update users table
            if ($userData) {
                $uFirst = trim((string)($userData['first_name'] ?? ''));
                $uLast  = trim((string)($userData['last_name'] ?? ''));
                $uName  = trim((string)($userData['name'] ?? "$uFirst $uLast"));
                $uRole  = (string)($userData['role'] ?? 'trainer');

                $validRoles = ['admin', 'hr', 'finance', 'trainer', 'frontdesk'];
                if (!in_array($uRole, $validRoles, true)) {
                    json_error("Ungueltige Rolle: $uRole", 400);
                }

                try {
                    $stmt = $db->prepare("
                        UPDATE users SET name = ?, first_name = ?, last_name = ?, email = ?, 
                        phone = ?, role = ?, active = ?, staff_number = COALESCE(?, staff_number)
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $uName, $uFirst, $uLast,
                        trim((string)($userData['email'] ?? '')),
                        $userData['phone'] ?? null,
                        $uRole,
                        !empty($userData['active']) ? 1 : 0,
                        $userData['staff_number'] ?? null,
                        $id,
                    ]);
                } catch (Throwable $e) {
                    // Fallback without optional columns
                    try {
                        $db->prepare("UPDATE users SET name = ?, email = ?, role = ?, active = ? WHERE id = ?")
                            ->execute([$uName, trim((string)($userData['email'] ?? '')), $uRole, !empty($userData['active']) ? 1 : 0, $id]);
                    } catch (Throwable $e2) { /* ignore */ }
                }
            }

            // 2. Upsert team_profile
            if ($profileData) {
                $pFirst    = trim((string)($profileData['first_name'] ?? ''));
                $pLast     = trim((string)($profileData['last_name'] ?? ''));
                $pPosition = trim((string)($profileData['position'] ?? ''));
                $pType     = in_array($profileData['type'] ?? '', ['leadership', 'coach']) ? $profileData['type'] : 'coach';
                $pVisible  = !empty($profileData['visible']) ? 1 : 0;
                $pSort     = (int)($profileData['sort_order'] ?? 0);
                $pSlug     = trim((string)($profileData['slug'] ?? strtolower(preg_replace('/[^a-z0-9]+/', '-', strtolower("$pFirst-$pLast")))));
                $pBio      = mb_substr(trim((string)($profileData['bio'] ?? '')), 0, 800);
                $pMetaBio  = trim((string)($profileData['meta_bio'] ?? ''));
                $pSpecs    = json_encode($profileData['specialties'] ?? []);
                $pCerts    = json_encode($profileData['certifications'] ?? []);
                $pInsta    = trim((string)($profileData['instagram'] ?? ''));
                $pFb       = trim((string)($profileData['facebook'] ?? ''));
                $pLi       = trim((string)($profileData['linkedin'] ?? ''));
                $pTik      = trim((string)($profileData['tiktok'] ?? ''));
                $pSnap     = trim((string)($profileData['snapchat'] ?? ''));
                $pImg      = trim((string)($profileData['profile_image'] ?? ''));
                $pDetImg   = trim((string)($profileData['detail_image'] ?? ''));

                try {
                    $stmtCheck = $db->prepare("SELECT id FROM team_profiles WHERE user_id = ? LIMIT 1");
                    $stmtCheck->execute([$id]);
                    $existingProfile = $stmtCheck->fetch();
                } catch (Throwable $e) { /* */ }

                if (!$existingProfile && $pFirst && $pLast) {
                    try {
                        $stmtCheck2 = $db->prepare("SELECT id FROM team_profiles WHERE LOWER(TRIM(first_name)) = LOWER(?) AND LOWER(TRIM(last_name)) = LOWER(?) LIMIT 1");
                        $stmtCheck2->execute([$pFirst, $pLast]);
                        $existingProfile = $stmtCheck2->fetch();
                    } catch (Throwable $e) { /* */ }
                }

                if ($existingProfile) {
                    $profileId = (int)$existingProfile['id'];
                    $slugCheck = $db->prepare("SELECT id FROM team_profiles WHERE slug = ? AND id != ?");
                    $slugCheck->execute([$pSlug, $profileId]);
                    if ($slugCheck->fetch()) $pSlug .= '-' . time();

                    $stmt = $db->prepare("
                        UPDATE team_profiles SET 
                            user_id = ?, slug = ?, first_name = ?, last_name = ?, position = ?, type = ?,
                            profile_image = ?, detail_image = ?, bio = ?, meta_bio = ?,
                            specialties = ?, certifications = ?,
                            instagram = ?, facebook = ?, linkedin = ?, tiktok = ?, snapchat = ?,
                            visible = ?, sort_order = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $id, $pSlug, $pFirst, $pLast, $pPosition, $pType,
                        $pImg, $pDetImg, $pBio, $pMetaBio,
                        $pSpecs, $pCerts,
                        $pInsta, $pFb, $pLi, $pTik, $pSnap,
                        $pVisible, $pSort,
                        $profileId,
                    ]);
                } else {
                    $slugCheck = $db->prepare("SELECT id FROM team_profiles WHERE slug = ?");
                    $slugCheck->execute([$pSlug]);
                    if ($slugCheck->fetch()) $pSlug .= '-' . time();

                    $stmt = $db->prepare("
                        INSERT INTO team_profiles 
                            (user_id, slug, first_name, last_name, position, type,
                             profile_image, detail_image, bio, meta_bio,
                             specialties, certifications,
                             instagram, facebook, linkedin, tiktok, snapchat,
                             visible, sort_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $id, $pSlug, $pFirst, $pLast, $pPosition, $pType,
                        $pImg, $pDetImg, $pBio, $pMetaBio,
                        $pSpecs, $pCerts,
                        $pInsta, $pFb, $pLi, $pTik, $pSnap,
                        $pVisible, $pSort,
                    ]);
                }

                // Mirror to legacy team_members
                try {
                    $legacyCheck = $db->prepare("SELECT id FROM team_members WHERE user_id = ? LIMIT 1");
                    $legacyCheck->execute([$id]);
                    $legacyRow = $legacyCheck->fetch();
                    if ($legacyRow) {
                        $db->prepare("UPDATE team_members SET name = ?, position = ?, image = ?, visible = ? WHERE id = ?")
                            ->execute([trim("$pFirst $pLast"), $pPosition, $pImg, $pVisible, $legacyRow['id']]);
                    }
                } catch (Throwable $e) { /* team_members might not exist */ }
            }

            try { _log_audit($admin, 'UPDATE_PROFILE', 'user', $id, ['profile_updated' => (bool)$profileData]); } catch (Throwable $e) {}
            json_success(['success' => true, 'action' => 'update_profile']);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // DELETE
    // ══════════════════════════════════════════════════════════════════════
    if ($method === 'DELETE' && isset($_GET['id'])) {
        $id = (int)$_GET['id'];
        $delete_member = isset($_GET['delete_member']) && $_GET['delete_member'] === 'true';

        if ($id === ($admin['id'] ?? 0)) json_error('Du kannst dich nicht selbst loeschen.', 400);

        $member_id = null;
        try {
            $stmt = $db->prepare("SELECT member_id FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            $member_id = $row ? ($row['member_id'] ?? null) : null;
        } catch (Throwable $e) { /* member_id column might not exist */ }

        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);

        if ($delete_member && $member_id) {
            try {
                $db->prepare("DELETE FROM members WHERE id = ?")->execute([$member_id]);
                _log_audit($admin, 'DELETE_MEMBER', 'member', (int)$member_id, ['reason' => 'Staff account deleted']);
            } catch (Throwable $e) { /* ignore */ }
        }

        try { _log_audit($admin, 'DELETE_STAFF', 'user', $id); } catch (Throwable $e) {}
        json_success(['success' => true]);
    }

    json_error('Ungueltige Anfrage', 400);
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Load a single user with progressive fallback for missing columns.
 */
function _load_user_safe(PDO $db, int $id): ?array
{
    // Try full query first
    $queries = [
        "SELECT id, staff_number, name, first_name, last_name, email, phone, date_of_birth, role, permissions, member_id, active FROM users WHERE id = ?",
        "SELECT id, name, first_name, last_name, email, role, active FROM users WHERE id = ?",
        "SELECT id, name, email, role, active FROM users WHERE id = ?",
    ];

    foreach ($queries as $sql) {
        try {
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            if ($user) {
                // Ensure all expected keys exist
                $user['staff_number']  = $user['staff_number'] ?? null;
                $user['first_name']    = $user['first_name'] ?? '';
                $user['last_name']     = $user['last_name'] ?? '';
                $user['phone']         = $user['phone'] ?? null;
                $user['date_of_birth'] = $user['date_of_birth'] ?? null;
                $user['permissions']   = $user['permissions'] ?? '[]';
                $user['member_id']     = $user['member_id'] ?? null;
                $user['active']        = $user['active'] ?? 1;
                return $user;
            }
            return null;
        } catch (Throwable $e) {
            continue; // Try next simpler query
        }
    }
    return null;
}

/**
 * Load permissions for a single user (detail view).
 */
function _load_permissions_safe(PDO $db, array $user): array
{
    // First try: parse from JSON field
    $perms = [];
    if (!empty($user['permissions']) && is_string($user['permissions'])) {
        $decoded = json_decode($user['permissions'], true);
        if (is_array($decoded)) $perms = $decoded;
    }

    // Second try: role_permissions table (Single Source of Truth)
    try {
        $perms = get_effective_permissions((string)($user['role'] ?? ''), (int)($user['id'] ?? 0));
    } catch (Throwable $e) {
        // Table doesn't exist yet – use legacy JSON or empty
    }

    return $perms;
}

/**
 * Load role permissions for list view.
 */
function _load_role_permissions_safe(PDO $db, string $role, int $userId): array
{
    $perms = [];

    try {
        $permStmt = $db->prepare("SELECT permission_key FROM role_permissions WHERE role = ?");
        $permStmt->execute([$role]);
        $perms = $permStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    } catch (Throwable $e) {
        return [];
    }

    try {
        $overStmt = $db->prepare("SELECT permission_key, granted FROM user_permissions WHERE user_id = ?");
        $overStmt->execute([$userId]);
        $overrides = $overStmt->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
        foreach ($overrides as $key => $granted) {
            if ((int)$granted === 1 && !in_array($key, $perms, true)) {
                $perms[] = $key;
            }
            if ((int)$granted === 0) {
                $perms = array_values(array_filter($perms, fn($p) => $p !== $key));
            }
        }
    } catch (Throwable $e) { /* user_permissions table might not exist */ }

    return $perms;
}

/**
 * Query staff list with progressive fallback.
 */
function _query_staff_list(PDO $db): PDOStatement
{
    $queries = [
        // Full query with all JOINs
        "SELECT u.id, u.staff_number, u.name, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth, u.role, u.active, 
                l.name as location_name, tp.id as team_profile_id, tp.visible as profile_visible
         FROM users u 
         LEFT JOIN locations l ON u.location_id = l.id
         LEFT JOIN team_profiles tp ON tp.user_id = u.id
         WHERE u.role != 'member' ORDER BY u.active DESC, u.role ASC",

        // Without locations
        "SELECT u.id, u.staff_number, u.name, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth, u.role, u.active,
                NULL as location_name, tp.id as team_profile_id, tp.visible as profile_visible
         FROM users u 
         LEFT JOIN team_profiles tp ON tp.user_id = u.id
         WHERE u.role != 'member' ORDER BY u.active DESC, u.role ASC",

        // Without team_profiles JOIN
        "SELECT id, name, first_name, last_name, email, role, active,
                NULL as staff_number, NULL as phone, NULL as date_of_birth,
                NULL as location_name, NULL as team_profile_id, NULL as profile_visible
         FROM users WHERE role != 'member' ORDER BY active DESC, role ASC",

        // Absolute minimum
        "SELECT id, name, email, role, active,
                NULL as first_name, NULL as last_name, NULL as staff_number, NULL as phone,
                NULL as date_of_birth, NULL as location_name, NULL as team_profile_id, NULL as profile_visible
         FROM users WHERE role != 'member' ORDER BY active DESC",
    ];

    foreach ($queries as $sql) {
        try {
            return $db->query($sql);
        } catch (Throwable $e) {
            continue;
        }
    }

    // If everything fails, return empty result
    return $db->query("SELECT 1 as id, 'Error' as name, '' as email, 'admin' as role, 1 as active WHERE 0");
}

/**
 * Get table column names (safe).
 */
function _get_table_columns(PDO $db, string $table): array
{
    try {
        $cols = [];
        $result = $db->query("SHOW COLUMNS FROM `$table`");
        foreach ($result->fetchAll() as $c) {
            $cols[] = $c['Field'];
        }
        return $cols;
    } catch (Throwable $e) {
        return [];
    }
}

/**
 * Generate next staff number.
 */
function _generate_staff_number(PDO $db): string
{
    try {
        $stmt = $db->query("SELECT MAX(CAST(SUBSTRING_INDEX(staff_number, '-', -1) AS UNSIGNED)) FROM users WHERE staff_number LIKE 'EMP-%'");
        return 'EMP-' . str_pad((string)((int)$stmt->fetchColumn() + 1), 3, '0', STR_PAD_LEFT);
    } catch (Throwable $e) {
        return 'EMP-' . str_pad((string)random_int(100, 999), 3, '0', STR_PAD_LEFT);
    }
}

/**
 * Log an audit entry (best-effort).
 * Delegiert an den zentralen audit_log() Helper in config.php.
 * UUID, IP, User-Agent und Session-ID werden dort automatisch ermittelt.
 */
function _log_audit(array $admin, string $action, string $type, int $id, array $details = []): void
{
    audit_log($admin, $action, $type, $id, $details);
}
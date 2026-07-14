<?php
/**
 * pricing.php – Modulares Pricing API (BasePlans + AddOns + Notes)
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpunkte:
 *   GET    /api/pricing.php                      → Aktive Pricing-Daten (public, kein Auth)
 *   GET    /api/pricing.php?admin=1              → Alle Pricing-Daten inkl. inaktive (Admin)
 *   POST   /api/pricing.php?action=save_plans    → Basis-Tarife speichern (Admin)
 *   POST   /api/pricing.php?action=save_addons   → Add-ons speichern (Admin)
 *   POST   /api/pricing.php?action=save_notes    → Notizen speichern (Admin)
 *
 * Benötigt: Tabellen pricing_plans, pricing_addons, pricing_addon_options,
 *           pricing_notes (siehe /api/sql/pricing_setup.sql)
 */

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$admin  = $_GET['admin']  ?? '';
$pdo    = db();

// ── Spalten-Erkennung für additive Migrationen ───────────────────────────────
// (api/sql/2026-07-11_addon_row_model.sql). Fehlt eine Spalte, degradiert die
// API sanft: neue Felder werden weder gelesen noch geschrieben.
function pr_has_column(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $key = $table . '.' . $column;
    if (!array_key_exists($key, $cache)) {
        try {
            // Engine-portabel: MariaDB 10.4 (Staging) lehnt einen gebundenen
            // Parameter in einem echten Server-Prepare von SHOW COLUMNS ab
            // (config.php setzt ATTR_EMULATE_PREPARES=false → Fehler 1064).
            // Tabellen-/Spaltennamen sind hier feste Konstanten, kein User-Input,
            // daher literales query() + exakter Abgleich in PHP (kein LIKE-
            // Wildcard-Risiko durch '_' in Spalten wie right_text/description).
            $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
            $cols = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN, 0) : [];
            $cache[$key] = in_array($column, $cols, true);
        } catch (PDOException $e) {
            $cache[$key] = false;
        }
    }
    return $cache[$key];
}

// Icon-Whitelist: nur bekannte Lucide-Bezeichner (verhindert beliebige Strings
// im Icon-Feld; das Frontend mappt Unbekanntes ohnehin auf den Default).
const PR_ALLOWED_ICONS = [
    'Zap', 'Dumbbell', 'Heart', 'Star', 'Shield', 'Coffee', 'Users', 'Clock',
    'Award', 'Target', 'TrendingUp', 'Flame', 'Sparkles', 'Waves', 'Sun', 'Plus',
];


// ═══════════════════════════════════════════════════════════════════════════════
// GET – Pricing-Daten laden
// ═══════════════════════════════════════════════════════════════════════════════
if ($method === 'GET') {

    // Prüfe ob Tabellen existieren, sonst Fallback
    try {
        $pdo->query("SELECT 1 FROM pricing_plans LIMIT 1");
    } catch (PDOException $e) {
        // Tabellen existieren noch nicht → leere Daten zurückgeben
        // Das Frontend nutzt dann den DEFAULT_PRICING_DATA Fallback
        json_success([
            'basePlans'     => [],
            'addOns'        => [],
            'contractNote'  => '',
            'blaulichtNote' => '',
        ]);
    }

    $isAdmin = false;
    if ($admin === '1') {
        require_admin();
        $isAdmin = true;
    }

    // ── Basis-Tarife laden ──────────────────────────────────────────────────
    $where = $isAdmin ? '' : 'WHERE active = 1';
    $plans = $pdo->query("
        SELECT * FROM pricing_plans {$where} ORDER BY sort_order ASC, id ASC
    ")->fetchAll();

    $basePlans = array_map(function ($p) {
        return [
            'id'                => $p['slug'],
            'name'              => $p['name'],
            'price'             => (int)$p['price'],
            'period'            => $p['period'],
            'description'       => $p['description'],
            'highlight'         => (bool)$p['highlight'],
            'badge'             => $p['badge'] ?: null,
            'features'          => json_decode($p['features'], true) ?? [],
            'cta'               => $p['cta'] ?? 'Jetzt starten',
            'restrictions'      => $p['restrictions'] ?: null,
            'blaulichtDiscount' => $p['blaulicht_discount'] ? (int)$p['blaulicht_discount'] : null,
            'studentPrice'      => $p['student_price'] ? (int)$p['student_price'] : null,
            'sortOrder'         => (int)$p['sort_order'],
            'active'            => (bool)$p['active'],
        ];
    }, $plans);

    // ── Add-ons laden ───────────────────────────────────────────────────────
    // Erweiterte Spalten sind additiv (api/sql/2026-07-11_addon_row_model.sql);
    // vor der Migration liefert die API die bisherige Payload plus abgeleitete
    // leftText/rightText-Felder. Options werden pro Add-on geladen statt über
    // GROUP_CONCAT, damit Freitext keine Trennzeichen-Kollisionen erzeugt.
    $hasIcon    = pr_has_column($pdo, 'pricing_addons', 'icon');
    $hasRight   = pr_has_column($pdo, 'pricing_addon_options', 'right_text');
    $hasOptDesc = pr_has_column($pdo, 'pricing_addon_options', 'description');
    $hasOptVis  = pr_has_column($pdo, 'pricing_addon_options', 'visible');

    $addonsWhere = $isAdmin ? '' : 'WHERE a.active = 1';
    $addons = $pdo->query("
        SELECT a.* FROM pricing_addons a
        {$addonsWhere}
        ORDER BY a.sort_order ASC
    ")->fetchAll();

    $optCols = 'label, price, sort_order'
        . ($hasRight   ? ', right_text'  : '')
        . ($hasOptDesc ? ', description' : '')
        . ($hasOptVis  ? ', visible'     : '');
    $optStmt = $pdo->prepare("
        SELECT {$optCols} FROM pricing_addon_options
        WHERE addon_id = :aid ORDER BY sort_order ASC
    ");

    $addOnsList = [];
    foreach ($addons as $a) {
        $optStmt->execute([':aid' => $a['id']]);
        $options = array_map(function ($o) {
            $price = (float)$o['price'];
            $right = (isset($o['right_text']) && $o['right_text'] !== null && $o['right_text'] !== '')
                ? $o['right_text']
                : '+' . (fmod($price, 1.0) === 0.0 ? (string)(int)$price : (string)$price) . '€';
            return [
                'label'       => $o['label'],
                'price'       => (int)$price,
                'leftText'    => $o['label'],
                'rightText'   => $right,
                'description' => isset($o['description']) && $o['description'] !== '' ? $o['description'] : null,
                'visible'     => array_key_exists('visible', $o) ? ($o['visible'] === null || (int)$o['visible'] === 1) : true,
            ];
        }, $optStmt->fetchAll());

        $addOnsList[] = [
            'id'          => $a['slug'],
            'name'        => $a['name'],
            'description' => $a['description'] ?: null,
            'icon'        => $hasIcon ? ($a['icon'] ?: null) : null,
            'options'     => $options,
            'sortOrder'   => (int)$a['sort_order'],
            'active'      => (bool)$a['active'],
        ];
    }

    // ── Notes laden ─────────────────────────────────────────────────────────
    $contractNote  = '';
    $blaulichtNote = '';

    try {
        $notes = $pdo->query("SELECT note_key, note_value FROM pricing_notes")->fetchAll();
        foreach ($notes as $n) {
            if ($n['note_key'] === 'contract')   $contractNote  = $n['note_value'];
            if ($n['note_key'] === 'blaulicht')   $blaulichtNote = $n['note_value'];
        }
    } catch (PDOException $e) {
        // Tabelle existiert noch nicht → defaults
    }

    json_success([
        'basePlans'     => $basePlans,
        'addOns'        => $addOnsList,
        'contractNote'  => $contractNote,
        'blaulichtNote' => $blaulichtNote,
    ]);
}


// ═══════════════════════════════════════════════════════════════════════════════
// POST – Admin: Daten speichern
// ═══════════════════════════════════════════════════════════════════════════════
if ($method === 'POST') {
    require_admin();
    $body = get_body();

    // ── save_plans ──────────────────────────────────────────────────────────
    if ($action === 'save_plans') {
        $crudAction = $body['action'] ?? null;  // "create", "update", "delete"

        // ── CRUD-Modus: Einzelner Plan (Frontend sendet { plan: {...}, action: "create"|"update" } oder { id: "...", action: "delete" })
        if ($crudAction === 'delete') {
            $slug = $body['id'] ?? '';
            if (empty($slug)) {
                json_error('Plan-ID (slug) zum Löschen erforderlich.', 422);
            }
            try {
                $stmt = $pdo->prepare("DELETE FROM pricing_plans WHERE slug = :slug");
                $stmt->execute([':slug' => $slug]);
                json_success(['message' => "Tarif \"{$slug}\" gelöscht."]);
            } catch (Exception $e) {
                json_error('Fehler beim Löschen: ' . $e->getMessage(), 500);
            }
        }

        if ($crudAction === 'create' || $crudAction === 'update') {
            $p = $body['plan'] ?? null;
            if (!is_array($p) || empty($p['name'])) {
                json_error('Plan-Objekt mit name erwartet.', 422);
            }

            try {
                $slug = $p['id'] ?? $p['slug'] ?? strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $p['name']));

                $stmt = $pdo->prepare("
                    INSERT INTO pricing_plans
                        (slug, name, price, period, description, highlight, badge, features, cta,
                         restrictions, blaulicht_discount, student_price, sort_order, active)
                    VALUES
                        (:slug, :name, :price, :period, :desc, :highlight, :badge, :features, :cta,
                         :restrictions, :blaulicht, :student, :sort, 1)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        price = VALUES(price),
                        period = VALUES(period),
                        description = VALUES(description),
                        highlight = VALUES(highlight),
                        badge = VALUES(badge),
                        features = VALUES(features),
                        cta = VALUES(cta),
                        restrictions = VALUES(restrictions),
                        blaulicht_discount = VALUES(blaulicht_discount),
                        student_price = VALUES(student_price),
                        sort_order = VALUES(sort_order),
                        active = 1
                ");

                $features = $p['features'] ?? [];
                if (is_string($features)) {
                    $features = json_decode($features, true) ?? [];
                }

                $stmt->execute([
                    ':slug'         => $slug,
                    ':name'         => $p['name'],
                    ':price'        => (int)($p['price'] ?? 0),
                    ':period'       => $p['period'] ?? 'pro Monat',
                    ':desc'         => $p['description'] ?? '',
                    ':highlight'    => (int)($p['highlight'] ?? 0),
                    ':badge'        => $p['badge'] ?? null,
                    ':features'     => json_encode($features, JSON_UNESCAPED_UNICODE),
                    ':cta'          => $p['cta'] ?? 'Jetzt starten',
                    ':restrictions' => $p['restrictions'] ?? null,
                    ':blaulicht'    => $p['blaulichtDiscount'] ?? null,
                    ':student'      => $p['studentPrice'] ?? null,
                    ':sort'         => $p['sortOrder'] ?? 0,
                ]);

                json_success(['message' => "Tarif \"{$p['name']}\" " . ($crudAction === 'update' ? 'aktualisiert' : 'erstellt') . '.' ]);
            } catch (Exception $e) {
                json_error('Fehler beim Speichern: ' . $e->getMessage(), 500);
            }
        }

        // ── Bulk-Modus (Legacy): { basePlans: [{...}, ...] }
        $plans = $body['basePlans'] ?? [];
        if (!is_array($plans) || empty($plans)) {
            json_error('basePlans Array oder { plan: {...}, action: "create"|"update"|"delete" } erwartet.', 422);
        }

        $pdo->beginTransaction();
        try {
            // Alle existierenden deaktivieren
            $pdo->exec("UPDATE pricing_plans SET active = 0");

            $stmt = $pdo->prepare("
                INSERT INTO pricing_plans
                    (slug, name, price, period, description, highlight, badge, features, cta,
                     restrictions, blaulicht_discount, student_price, sort_order, active)
                VALUES
                    (:slug, :name, :price, :period, :desc, :highlight, :badge, :features, :cta,
                     :restrictions, :blaulicht, :student, :sort, 1)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    price = VALUES(price),
                    period = VALUES(period),
                    description = VALUES(description),
                    highlight = VALUES(highlight),
                    badge = VALUES(badge),
                    features = VALUES(features),
                    cta = VALUES(cta),
                    restrictions = VALUES(restrictions),
                    blaulicht_discount = VALUES(blaulicht_discount),
                    student_price = VALUES(student_price),
                    sort_order = VALUES(sort_order),
                    active = 1
            ");

            foreach ($plans as $i => $p) {
                $stmt->execute([
                    ':slug'         => $p['id'] ?? 'plan-' . $i,
                    ':name'         => $p['name'] ?? 'Plan ' . ($i + 1),
                    ':price'        => (int)($p['price'] ?? 0),
                    ':period'       => $p['period'] ?? 'pro Monat',
                    ':desc'         => $p['description'] ?? '',
                    ':highlight'    => (int)($p['highlight'] ?? 0),
                    ':badge'        => $p['badge'] ?? null,
                    ':features'     => json_encode($p['features'] ?? [], JSON_UNESCAPED_UNICODE),
                    ':cta'          => $p['cta'] ?? 'Jetzt starten',
                    ':restrictions' => $p['restrictions'] ?? null,
                    ':blaulicht'    => $p['blaulichtDiscount'] ?? null,
                    ':student'      => $p['studentPrice'] ?? null,
                    ':sort'         => $p['sortOrder'] ?? $i,
                ]);
            }

            $pdo->commit();
            json_success(['message' => count($plans) . ' Tarife gespeichert.']);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_error('Fehler beim Speichern: ' . $e->getMessage(), 500);
        }
    }

    // ── save_addons ─────────────────────────────────────────────────────────
    // Bulk-Upsert der kompletten Add-on-Liste (Reihenfolge = sortOrder).
    // Nicht mitgesendete Add-ons werden DEAKTIVIERT, nie hart gelöscht –
    // Hartlöschen nur über action=delete_addon mit expliziter Bestätigung.
    if ($action === 'save_addons') {
        $addons = $body['addOns'] ?? [];
        if (!is_array($addons)) {
            json_error('addOns Array erwartet.', 422);
        }

        // ── Validierung (IDs, Längen, Icon-Whitelist, Rows) vor dem Schreiben ─
        foreach ($addons as $i => $a) {
            $name = trim((string)($a['name'] ?? ''));
            if ($name === '' || mb_strlen($name) > 120) {
                json_error("Add-on #{$i}: name ist Pflicht (max. 120 Zeichen).", 422);
            }
            $slug = (string)($a['id'] ?? '');
            if ($slug !== '' && !preg_match('/^[a-z0-9][a-z0-9\-]{0,79}$/', $slug)) {
                json_error("Add-on #{$i}: ungueltiger Slug \"{$slug}\" (a-z, 0-9, Bindestrich).", 422);
            }
            if (isset($a['icon']) && $a['icon'] !== null && $a['icon'] !== ''
                && !in_array($a['icon'], PR_ALLOWED_ICONS, true)) {
                json_error("Add-on #{$i}: unbekanntes Icon \"{$a['icon']}\".", 422);
            }
            if (isset($a['description']) && mb_strlen((string)$a['description']) > 500) {
                json_error("Add-on #{$i}: description zu lang (max. 500).", 422);
            }
            if (!is_array($a['options'] ?? [])) {
                json_error("Add-on #{$i}: options muss ein Array sein.", 422);
            }
            foreach (($a['options'] ?? []) as $oi => $opt) {
                $left  = (string)($opt['leftText'] ?? $opt['label'] ?? '');
                $right = (string)($opt['rightText'] ?? '');
                if ($left === '' || mb_strlen($left) > 120) {
                    json_error("Add-on #{$i}, Zeile #{$oi}: leftText ist Pflicht (max. 120).", 422);
                }
                if (mb_strlen($right) > 120) {
                    json_error("Add-on #{$i}, Zeile #{$oi}: rightText zu lang (max. 120).", 422);
                }
                if (isset($opt['description']) && mb_strlen((string)$opt['description']) > 255) {
                    json_error("Add-on #{$i}, Zeile #{$oi}: description zu lang (max. 255).", 422);
                }
            }
        }

        $hasIcon    = pr_has_column($pdo, 'pricing_addons', 'icon');
        $hasRight   = pr_has_column($pdo, 'pricing_addon_options', 'right_text');
        $hasOptDesc = pr_has_column($pdo, 'pricing_addon_options', 'description');
        $hasOptVis  = pr_has_column($pdo, 'pricing_addon_options', 'visible');

        $pdo->beginTransaction();
        try {
            // Alle existierenden deaktivieren (Bulk = vollstaendige Liste)
            $pdo->exec("UPDATE pricing_addons SET active = 0");

            $iconInsert = $hasIcon ? ', icon' : '';
            $iconValue  = $hasIcon ? ', :icon' : '';
            $iconUpdate = $hasIcon ? ', icon = VALUES(icon)' : '';
            $stmtAddon = $pdo->prepare("
                INSERT INTO pricing_addons (slug, name, description, sort_order, active{$iconInsert})
                VALUES (:slug, :name, :desc, :sort, 1{$iconValue})
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    sort_order = VALUES(sort_order),
                    active = 1{$iconUpdate}
            ");

            $optInsert = 'addon_id, label, price, sort_order'
                . ($hasRight   ? ', right_text'  : '')
                . ($hasOptDesc ? ', description' : '')
                . ($hasOptVis  ? ', visible'     : '');
            $optValues = ':addon_id, :label, :price, :sort'
                . ($hasRight   ? ', :right'   : '')
                . ($hasOptDesc ? ', :odesc'   : '')
                . ($hasOptVis  ? ', :visible' : '');
            $stmtOption = $pdo->prepare("
                INSERT INTO pricing_addon_options ({$optInsert})
                VALUES ({$optValues})
            ");

            $idStmt = $pdo->prepare("SELECT id FROM pricing_addons WHERE slug = :slug");
            $delStmt = $pdo->prepare("DELETE FROM pricing_addon_options WHERE addon_id = :aid");

            foreach ($addons as $i => $a) {
                $slug = $a['id'] ?? 'addon-' . $i;
                $params = [
                    ':slug' => $slug,
                    ':name' => trim((string)$a['name']),
                    ':desc' => $a['description'] ?? null,
                    ':sort' => (int)($a['sortOrder'] ?? $i),
                ];
                if ($hasIcon) $params[':icon'] = ($a['icon'] ?? null) ?: null;
                $stmtAddon->execute($params);

                $idStmt->execute([':slug' => $slug]);
                $addonId = (int)$idStmt->fetchColumn();

                $delStmt->execute([':aid' => $addonId]);

                foreach (($a['options'] ?? []) as $oi => $opt) {
                    $optParams = [
                        ':addon_id' => $addonId,
                        ':label'    => (string)($opt['leftText'] ?? $opt['label'] ?? ''),
                        ':price'    => (int)($opt['price'] ?? 0),
                        ':sort'     => $oi,
                    ];
                    if ($hasRight)   $optParams[':right']   = ($opt['rightText'] ?? '') !== '' ? (string)$opt['rightText'] : null;
                    if ($hasOptDesc) $optParams[':odesc']   = ($opt['description'] ?? '') !== '' ? (string)$opt['description'] : null;
                    if ($hasOptVis)  $optParams[':visible'] = (isset($opt['visible']) && $opt['visible'] === false) ? 0 : 1;
                    $stmtOption->execute($optParams);
                }
            }

            $pdo->commit();
            json_success(['message' => count($addons) . ' Add-ons gespeichert.']);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_error('Fehler beim Speichern: ' . $e->getMessage(), 500);
        }
    }

    // ── delete_addon (bewachtes Hartloeschen) ───────────────────────────────
    if ($action === 'delete_addon') {
        $slug = (string)($body['id'] ?? '');
        if ($slug === '') {
            json_error('Add-on-ID (slug) zum Loeschen erforderlich.', 422);
        }
        if (empty($body['confirm'])) {
            json_error('Hartloeschen erfordert "confirm": true. (Deaktivieren geht ueber save_addons ohne das Add-on.)', 409);
        }
        try {
            $idStmt = $pdo->prepare("SELECT id FROM pricing_addons WHERE slug = :slug");
            $idStmt->execute([':slug' => $slug]);
            $addonId = $idStmt->fetchColumn();
            if (!$addonId) {
                json_error("Add-on \"{$slug}\" nicht gefunden.", 404);
            }
            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM pricing_addon_options WHERE addon_id = :aid")->execute([':aid' => (int)$addonId]);
            $pdo->prepare("DELETE FROM pricing_addons WHERE id = :aid")->execute([':aid' => (int)$addonId]);
            $pdo->commit();
            json_success(['message' => "Add-on \"{$slug}\" endgueltig geloescht."]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            json_error('Fehler beim Loeschen: ' . $e->getMessage(), 500);
        }
    }

    // ── save_notes ──────────────────────────────────────────────────────────
    if ($action === 'save_notes') {
        $contractNote  = $body['contractNote']  ?? '';
        $blaulichtNote = $body['blaulichtNote'] ?? '';

        try {
            $stmt = $pdo->prepare("
                INSERT INTO pricing_notes (note_key, note_value)
                VALUES (:key, :val)
                ON DUPLICATE KEY UPDATE note_value = VALUES(note_value)
            ");
            $stmt->execute([':key' => 'contract',  ':val' => $contractNote]);
            $stmt->execute([':key' => 'blaulicht', ':val' => $blaulichtNote]);

            json_success(['message' => 'Notizen gespeichert.']);
        } catch (Exception $e) {
            json_error('Fehler beim Speichern: ' . $e->getMessage(), 500);
        }
    }

    json_error('Unbekannte Action: ' . $action, 400);
}


// ── Nicht unterstützte Methode ─────────────────────────────────────────────
json_error('Methode nicht unterstützt.', 405);
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
    $addonsWhere = $isAdmin ? '' : 'WHERE a.active = 1';
    $addons = $pdo->query("
        SELECT a.*, GROUP_CONCAT(
            CONCAT(o.label, '|||', o.price, '|||', o.sort_order)
            ORDER BY o.sort_order ASC
            SEPARATOR '###'
        ) as options_raw
        FROM pricing_addons a
        LEFT JOIN pricing_addon_options o ON o.addon_id = a.id
        {$addonsWhere}
        GROUP BY a.id
        ORDER BY a.sort_order ASC
    ")->fetchAll();

    $addOnsList = array_map(function ($a) {
        $options = [];
        if (!empty($a['options_raw'])) {
            foreach (explode('###', $a['options_raw']) as $opt) {
                $parts = explode('|||', $opt);
                if (count($parts) >= 2) {
                    $options[] = [
                        'label' => $parts[0],
                        'price' => (int)$parts[1],
                    ];
                }
            }
        }
        return [
            'id'          => $a['slug'],
            'name'        => $a['name'],
            'description' => $a['description'] ?: null,
            'options'     => $options,
            'sortOrder'   => (int)$a['sort_order'],
            'active'      => (bool)$a['active'],
        ];
    }, $addons);

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
    if ($action === 'save_addons') {
        $addons = $body['addOns'] ?? [];
        if (!is_array($addons)) {
            json_error('addOns Array erwartet.', 422);
        }

        $pdo->beginTransaction();
        try {
            // Alle existierenden deaktivieren
            $pdo->exec("UPDATE pricing_addons SET active = 0");

            $stmtAddon = $pdo->prepare("
                INSERT INTO pricing_addons (slug, name, description, sort_order, active)
                VALUES (:slug, :name, :desc, :sort, 1)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    sort_order = VALUES(sort_order),
                    active = 1
            ");

            $stmtOption = $pdo->prepare("
                INSERT INTO pricing_addon_options (addon_id, label, price, sort_order)
                VALUES (:addon_id, :label, :price, :sort)
            ");

            foreach ($addons as $i => $a) {
                $slug = $a['id'] ?? 'addon-' . $i;
                $stmtAddon->execute([
                    ':slug' => $slug,
                    ':name' => $a['name'] ?? 'Add-on ' . ($i + 1),
                    ':desc' => $a['description'] ?? null,
                    ':sort' => $a['sortOrder'] ?? $i,
                ]);

                // Addon-ID ermitteln
                $addonId = $pdo->query("SELECT id FROM pricing_addons WHERE slug = " . $pdo->quote($slug))->fetchColumn();

                // Alte Options löschen
                $pdo->exec("DELETE FROM pricing_addon_options WHERE addon_id = " . (int)$addonId);

                // Neue Options einfügen
                foreach (($a['options'] ?? []) as $oi => $opt) {
                    $stmtOption->execute([
                        ':addon_id' => $addonId,
                        ':label'    => $opt['label'] ?? '',
                        ':price'    => (int)($opt['price'] ?? 0),
                        ':sort'     => $oi,
                    ]);
                }
            }

            $pdo->commit();
            json_success(['message' => count($addons) . ' Add-ons gespeichert.']);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_error('Fehler beim Speichern: ' . $e->getMessage(), 500);
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
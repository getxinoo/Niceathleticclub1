<?php
/**
 * /api/public/pricing.php – Public Pricing API (seitenspezifisch)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/public/pricing.php?page={slug}
 *
 * Liefert seitenspezifische Pricing-Daten im PublicPricingResponse-Format.
 * Erlaubte page slugs: preise, startseite, firmenfitness, personal-training
 *
 * Kein Auth nötig – rein öffentliche Daten.
 * ─────────────────────────────────────────────────────────────────────────────
 */

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Nur GET erlaubt
if ($method !== 'GET') {
    json_error('Methode nicht unterstützt.', 405);
}

// ── Page Slug validieren ─────────────────────────────────────────────────────
$page = $_GET['page'] ?? 'preise';
$allowedPages = ['preise', 'startseite', 'firmenfitness', 'personal-training'];

if (!in_array($page, $allowedPages, true)) {
    json_error('Ungültiger page Parameter. Erlaubt: ' . implode(', ', $allowedPages), 400);
}

$pdo = db();

// ── Prüfe ob Tabellen existieren ─────────────────────────────────────────────
try {
    $pdo->query("SELECT 1 FROM pricing_page_plans LIMIT 1");
} catch (PDOException $e) {
    // Tabellen existieren noch nicht → leere Response
    echo json_encode([
        'page'       => $page,
        'plans'      => [],
        'addons'     => [],
        'notices'    => [],
        'comparison' => null,
        'pros_cons'  => null,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}


// ═══════════════════════════════════════════════════════════════════════════════
// 1. Plans – mit seitenspezifischen Overrides
// ═══════════════════════════════════════════════════════════════════════════════

$stmt = $pdo->prepare("
    SELECT
        p.id,
        p.slug,
        p.name,
        p.price,
        p.period,
        p.description,
        p.features,
        p.cta,
        p.restrictions,
        p.blaulicht_discount,
        p.student_price,
        pp.is_featured,
        pp.show_cta,
        pp.badge_text,
        pp.cta_text,
        pp.cta_url,
        pp.description_override,
        pp.features_override,
        pp.sort_order
    FROM pricing_page_plans pp
    INNER JOIN pricing_plans p ON p.id = pp.plan_id
    WHERE pp.page_slug = :page
      AND pp.is_visible = 1
      AND p.active = 1
    ORDER BY pp.sort_order ASC, p.sort_order ASC
");
$stmt->execute([':page' => $page]);
$rawPlans = $stmt->fetchAll();

$plans = array_map(function ($row) {
    $features = $row['features_override']
        ? json_decode($row['features_override'], true)
        : json_decode($row['features'], true);

    return [
        'id'                 => (int)$row['id'],
        'slug'               => $row['slug'],
        'name'               => $row['name'],
        'price'              => (float)$row['price'],
        'period'             => $row['period'],
        'description'        => $row['description_override'] ?: $row['description'],
        'features'           => $features ?? [],
        'badge_text'         => $row['badge_text'] ?: null,
        'is_featured'        => (bool)$row['is_featured'],
        'show_cta'           => (bool)$row['show_cta'],
        'cta_text'           => $row['cta_text'] ?: $row['cta'] ?: 'Jetzt starten',
        'cta_url'            => $row['cta_url'] ?: '/probetraining',
        'restrictions'       => $row['restrictions'] ?: null,
        'blaulicht_discount' => $row['blaulicht_discount'] ? (float)$row['blaulicht_discount'] : null,
        'student_price'      => $row['student_price'] ? (float)$row['student_price'] : null,
        'sort_order'         => (int)$row['sort_order'],
    ];
}, $rawPlans);


// ═══════════════════════════════════════════════════════════════════════════════
// 2. Add-ons – seitenspezifisch
// ═══════════════════════════════════════════════════════════════════════════════

// Erweiterte Spalten (icon / right_text / row-description / visible) sind
// additiv – siehe api/sql/2026-07-11_addon_row_model.sql. Vor der Migration
// fehlen sie in Produktion; dann liefert die API dieselbe Payload wie bisher
// plus abgeleitete leftText/rightText-Felder (rightText = "+{price}€").
function pp_has_column(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $key = $table . '.' . $column;
    if (!array_key_exists($key, $cache)) {
        try {
            $stmt = $pdo->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
            $stmt->execute([$column]);
            $cache[$key] = (bool)$stmt->fetch();
        } catch (PDOException $e) {
            $cache[$key] = false;
        }
    }
    return $cache[$key];
}

$hasIcon    = pp_has_column($pdo, 'pricing_addons', 'icon');
$hasRight   = pp_has_column($pdo, 'pricing_addon_options', 'right_text');
$hasOptDesc = pp_has_column($pdo, 'pricing_addon_options', 'description');
$hasOptVis  = pp_has_column($pdo, 'pricing_addon_options', 'visible');

$iconSel = $hasIcon ? ', a.icon' : '';
$stmt = $pdo->prepare("
    SELECT
        a.id,
        a.slug,
        a.name,
        a.description{$iconSel},
        pa.sort_order
    FROM pricing_page_addons pa
    INNER JOIN pricing_addons a ON a.id = pa.addon_id
    WHERE pa.page_slug = :page
      AND a.active = 1
    ORDER BY pa.sort_order ASC
");
$stmt->execute([':page' => $page]);
$rawAddons = $stmt->fetchAll();

$optCols = 'label, price'
    . ($hasRight   ? ', right_text'  : '')
    . ($hasOptDesc ? ', description' : '')
    . ($hasOptVis  ? ', visible'     : '');
$optWhere = $hasOptVis ? 'AND (visible IS NULL OR visible = 1)' : '';

$addons = [];
foreach ($rawAddons as $a) {
    $optStmt = $pdo->prepare("
        SELECT {$optCols} FROM pricing_addon_options
        WHERE addon_id = :aid {$optWhere} ORDER BY sort_order ASC
    ");
    $optStmt->execute([':aid' => $a['id']]);
    $options = $optStmt->fetchAll();

    $addons[] = [
        'id'          => (int)$a['id'],
        'slug'        => $a['slug'],
        'name'        => $a['name'],
        'description' => $a['description'] ?: null,
        'icon'        => $hasIcon ? ($a['icon'] ?: null) : null,
        'options'     => array_map(function ($o) {
            $price = (float)$o['price'];
            $right = (isset($o['right_text']) && $o['right_text'] !== null && $o['right_text'] !== '')
                ? $o['right_text']
                : '+' . (fmod($price, 1.0) === 0.0 ? (string)(int)$price : (string)$price) . '€';
            return [
                'label'       => $o['label'],
                'price'       => $price,
                'leftText'    => $o['label'],
                'rightText'   => $right,
                'description' => isset($o['description']) && $o['description'] !== '' ? $o['description'] : null,
            ];
        }, $options),
        'sort_order'  => (int)$a['sort_order'],
    ];
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. Notices – seitenspezifisch
// ═══════════════════════════════════════════════════════════════════════════════

$stmt = $pdo->prepare("
    SELECT id, type, title, text, sort_order
    FROM pricing_notices
    WHERE page_slug = :page AND active = 1
    ORDER BY sort_order ASC
");
$stmt->execute([':page' => $page]);
$rawNotices = $stmt->fetchAll();

$notices = array_map(function ($n) {
    return [
        'id'         => (int)$n['id'],
        'type'       => $n['type'],
        'title'      => $n['title'],
        'text'       => $n['text'],
        'sort_order'  => (int)$n['sort_order'],
    ];
}, $rawNotices);


// ═══════════════════════════════════════════════════════════════════════════════
// 4. Page Config (comparison & pros_cons an/aus?)
// ═══════════════════════════════════════════════════════════════════════════════

$stmt = $pdo->prepare("SELECT * FROM pricing_page_config WHERE page_slug = :page LIMIT 1");
$stmt->execute([':page' => $page]);
$config = $stmt->fetch();

$comparisonEnabled = $config ? (bool)$config['comparison_enabled'] : false;
$prosConsEnabled   = $config ? (bool)$config['pros_cons_enabled'] : false;


// ═══════════════════════════════════════════════════════════════════════════════
// 5. Comparison – Vergleichstabelle
// ═══════════════════════════════════════════════════════════════════════════════

$comparison = null;
if ($comparisonEnabled && !empty($plans)) {
    $stmt = $pdo->prepare("
        SELECT feature, values_json, sort_order
        FROM pricing_comparison_rows
        WHERE page_slug = :page AND active = 1
        ORDER BY sort_order ASC
    ");
    $stmt->execute([':page' => $page]);
    $rawRows = $stmt->fetchAll();

    $columns = array_map(function ($p) {
        return [
            'plan_slug'   => $p['slug'],
            'plan_name'   => $p['name'],
            'price'       => $p['price'] . ' €',
            'is_featured' => $p['is_featured'],
            'badge_text'  => $p['badge_text'],
        ];
    }, $plans);

    $rows = array_map(function ($r) {
        return [
            'feature' => $r['feature'],
            'values'  => json_decode($r['values_json'], true) ?? [],
        ];
    }, $rawRows);

    $comparison = [
        'enabled' => true,
        'columns' => $columns,
        'rows'    => $rows,
    ];
}


// ═══════════════════════════════════════════════════════════════════════════════
// 6. Pros/Cons
// ═══════════════════════════════════════════════════════════════════════════════

$pros_cons = null;
if ($prosConsEnabled && !empty($plans)) {
    $planIds = array_map(function ($p) { return $p['id']; }, $plans);
    $placeholders = implode(',', array_fill(0, count($planIds), '?'));

    $stmt = $pdo->prepare("
        SELECT pc.plan_id, pc.pros, pc.cons
        FROM pricing_pros_cons pc
        WHERE pc.page_slug = ? AND pc.plan_id IN ({$placeholders})
    ");
    $params = array_merge([$page], $planIds);
    $stmt->execute($params);
    $rawPC = $stmt->fetchAll();

    // Index by plan_id
    $pcMap = [];
    foreach ($rawPC as $r) {
        $pcMap[(int)$r['plan_id']] = $r;
    }

    $entries = [];
    foreach ($plans as $p) {
        $pc = $pcMap[$p['id']] ?? null;
        $entries[] = [
            'plan_slug'   => $p['slug'],
            'plan_name'   => $p['name'],
            'price'       => $p['price'] . ' €',
            'is_featured' => $p['is_featured'],
            'pros'        => $pc ? (json_decode($pc['pros'], true) ?? []) : [],
            'cons'        => $pc ? (json_decode($pc['cons'], true) ?? []) : [],
        ];
    }

    $pros_cons = [
        'enabled' => true,
        'entries' => $entries,
    ];
}


// ═══════════════════════════════════════════════════════════════════════════════
// Response
// ═══════════════════════════════════════════════════════════════════════════════

echo json_encode([
    'page'       => $page,
    'plans'      => $plans,
    'addons'     => $addons,
    'notices'    => $notices,
    'comparison' => $comparison,
    'pros_cons'  => $pros_cons,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
exit();

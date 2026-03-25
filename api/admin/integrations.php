<?php
/**
 * api/admin/integrations.php
 * Magicline Open API Integration (x-api-key) + Initial Import + Merge Queue
 *
 * Auth: Admin only
 * Storage: integration_settings(provider='magicline', keys: base_url, api_key, tenant_id, studio_id)
 */
declare(strict_types=1);
require_once '../config.php';

$admin = require_auth();
if (($admin['role'] ?? '') !== 'admin') json_error('Nicht autorisiert.', 403);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db = db();

function log_dir(): string {
  return dirname(__DIR__) . '/logs';
}
function log_file(): string {
  return log_dir() . '/magicline_debug.log';
}
function ml_log(string $level, string $msg, array $ctx = []): void {
  $dir = log_dir();
  if (!is_dir($dir)) @mkdir($dir, 0775, true);
  $line = '[' . date('Y-m-d H:i:s') . "] [$level] $msg";
  if (!empty($ctx)) $line .= "\n          " . json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $line .= "\n";
  @file_put_contents(log_file(), $line, FILE_APPEND | LOCK_EX);
}

function get_magicline_settings(PDO $db): array {
  $stmt = $db->prepare("SELECT setting_key, setting_value FROM integration_settings WHERE provider='magicline'");
  $stmt->execute();
  $out = [];
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) $out[$r['setting_key']] = $r['setting_value'];
  return $out;
}

function save_magicline_settings(PDO $db, array $data): void {
  $stmt = $db->prepare("
    INSERT INTO integration_settings (provider, setting_key, setting_value)
    VALUES ('magicline', ?, ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
  ");
  foreach ($data as $k => $v) {
    if ($v === '********') continue;
    $stmt->execute([$k, (string)$v]);
  }
}

function normalize_base_url(string $base): string {
  $base = rtrim(trim($base), '/');
  if (!str_ends_with($base, '/v1')) $base .= '/v1';
  return $base;
}

function http_req(string $method, string $url, string $apiKey, ?array $jsonBody = null): array {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);

  $headers = [
    'x-api-key: ' . $apiKey,
    'Accept: application/json',
    'Accept-Language: de'
  ];

  if ($jsonBody !== null) {
    $payload = json_encode($jsonBody);
    $headers[] = 'Content-Type: application/json';
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
  }

  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

  $body = curl_exec($ch);
  $err  = curl_error($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  return [$code, $body ?: '', $err ?: null];
}

function sha_payload(string $json): string {
  return hash('sha256', $json);
}

function get_or_create_contract_type(PDO $db, string $name, ?float $monthlyPrice = null): int {
  $name = trim($name);
  if ($name === '') $name = 'Magicline Import';

  $stmt = $db->prepare("SELECT id FROM contract_types WHERE name = ?");
  $stmt->execute([$name]);
  $id = $stmt->fetchColumn();
  if ($id) return (int)$id;

  $price = $monthlyPrice ?? 0.00;
  $stmt = $db->prepare("INSERT INTO contract_types (name, monthly_price, base_term_months, notice_period_days) VALUES (?, ?, 12, 30)");
  $stmt->execute([$name, $price]);
  return (int)$db->lastInsertId();
}

function find_member_by_email(PDO $db, string $email): ?int {
  $email = trim(mb_strtolower($email));
  if ($email === '') return null;

  $stmt = $db->prepare("SELECT id FROM members WHERE LOWER(email) = ? OR LOWER(email_contact) = ? LIMIT 1");
  $stmt->execute([$email, $email]);
  $id = $stmt->fetchColumn();
  return $id ? (int)$id : null;
}

function find_member_by_name(PDO $db, string $first, string $last): array {
  $first = trim($first);
  $last  = trim($last);
  if ($first === '' || $last === '') return [];

  $stmt = $db->prepare("SELECT id FROM members WHERE first_name = ? AND last_name = ? LIMIT 5");
  $stmt->execute([$first, $last]);
  return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

function upsert_raw_customer(PDO $db, string $tenant, string $studioId, array $c): void {
  $id = (int)($c['id'] ?? 0);
  if (!$id) return;

  $status = (string)($c['customerStatus'] ?? 'MEMBER');
  if (!in_array($status, ['MEMBER','PROSPECT','FORMER_MEMBER'], true)) $status = 'MEMBER';

  $json = json_encode($c, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $hash = sha_payload($json);

  $stmt = $db->prepare("
    INSERT INTO ml_customers_raw (magicline_customer_id, tenant, studio_id, customer_status, payload, payload_hash, last_seen_at, synced_at)
    VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      customer_status=VALUES(customer_status),
      payload=VALUES(payload),
      payload_hash=VALUES(payload_hash),
      last_seen_at=NOW(),
      synced_at=NOW()
  ");
  $stmt->execute([$id, $tenant, $studioId, $status, $json, $hash]);
}

function create_merge_candidate(PDO $db, int $mlId, string $matchType, ?int $suggestedId, array $suggestedIds, int $score, array $reasons): void {
  $stmt = $db->prepare("
    INSERT INTO merge_candidates (provider, entity_type, external_id, match_type, suggested_member_id, suggested_member_ids_json, score, reasons)
    VALUES ('magicline','member',?,?,?,CAST(? AS JSON),?,CAST(? AS JSON))
    ON DUPLICATE KEY UPDATE
      decision = IF(decision='PENDING', 'PENDING', decision),
      score=VALUES(score),
      reasons=VALUES(reasons),
      suggested_member_id=VALUES(suggested_member_id),
      suggested_member_ids_json=VALUES(suggested_member_ids_json)
  ");
  $stmt->execute([
    (string)$mlId,
    $matchType,
    $suggestedId,
    json_encode($suggestedIds),
    $score,
    json_encode($reasons, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
  ]);
}

function upsert_member(PDO $db, array $c, string $status, bool $nacMaster): array {
  $mlId = (string)($c['id'] ?? '');
  if ($mlId === '') return ['created'=>0,'updated'=>0,'member_id'=>null];

  $first = trim((string)($c['firstName'] ?? ''));
  $last  = trim((string)($c['lastName'] ?? ''));
  $email = trim((string)($c['email'] ?? ''));
  $phone = trim((string)($c['phone'] ?? ''));

  $checkInCode = 'ML' . strtoupper(substr(md5('ml-' . $mlId), 0, 8));
  $active = ($status === 'MEMBER') ? 1 : 0;

  // Wenn email leer => NULL. (DB muss email NULL erlauben!)
  $emailValue = ($email !== '') ? $email : null;

  // Member since (not null im Schema) -> fallback heute
  $memberSince = date('Y-m-d');

  // NAC Master: wir überschreiben NICHT.
  // Wir machen Upsert über magicline_id (unique).
  $stmt = $db->prepare("
    INSERT INTO members (magicline_id, location_id, first_name, last_name, email, email_contact, phone, member_since, check_in_code, active, magicline_customer_status, magicline_synced_at)
    VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      first_name = IF(?, first_name, VALUES(first_name)),
      last_name  = IF(?, last_name, VALUES(last_name)),
      email      = IF(?, email, VALUES(email)),
      email_contact = IF(?, email_contact, VALUES(email_contact)),
      phone      = IF(?, phone, VALUES(phone)),
      magicline_customer_status = VALUES(magicline_customer_status),
      magicline_synced_at = NOW()
  ");

  // IF(true, keep old, new) -> wir drehen das per Flags:
  // nacMaster=true => keep old when old not empty
  $keepNames   = $nacMaster;
  $keepEmail   = $nacMaster;
  $keepPhone   = $nacMaster;

  // Flags: wenn NAC Master, wollen wir nur überschreiben, wenn Feld leer ist.
  // Trick: wir geben "true" wenn wir NICHT überschreiben wollen:
  // if (nacMaster && existing not empty) -> true
  // Dafür lesen wir existing einmal kurz:
  $existing = $db->prepare("SELECT id, first_name, last_name, email, email_contact, phone FROM members WHERE magicline_id = ? LIMIT 1");
  $existing->execute([$mlId]);
  $ex = $existing->fetch(PDO::FETCH_ASSOC);

  $dontOverwriteFirst = false;
  $dontOverwriteLast  = false;
  $dontOverwriteEmail = false;
  $dontOverwriteEmailContact = false;
  $dontOverwritePhone = false;

  if ($nacMaster && $ex) {
    $dontOverwriteFirst = trim((string)$ex['first_name']) !== '';
    $dontOverwriteLast  = trim((string)$ex['last_name']) !== '';
    $dontOverwriteEmail = trim((string)$ex['email']) !== '';
    $dontOverwriteEmailContact = trim((string)$ex['email_contact']) !== '';
    $dontOverwritePhone = trim((string)$ex['phone']) !== '';
  }

  $stmt->execute([
    $mlId,
    $first ?: 'Unbekannt',
    $last  ?: 'Unbekannt',
    $emailValue,
    $email !== '' ? $email : null,
    $phone !== '' ? $phone : null,
    $memberSince,
    $checkInCode,
    $active,
    $status,
    $dontOverwriteFirst,
    $dontOverwriteLast,
    $dontOverwriteEmail,
    $dontOverwriteEmailContact,
    $dontOverwritePhone
  ]);

  $memberId = (int)($db->lastInsertId() ?: 0);
  if ($memberId === 0) {
    $q = $db->prepare("SELECT id FROM members WHERE magicline_id = ? LIMIT 1");
    $q->execute([$mlId]);
    $memberId = (int)$q->fetchColumn();
    return ['created'=>0,'updated'=>1,'member_id'=>$memberId];
  }
  return ['created'=>1,'updated'=>0,'member_id'=>$memberId];
}

function upsert_external_identity(PDO $db, string $entityType, string $externalId, int $localId): void {
  $stmt = $db->prepare("
    INSERT INTO external_identities (provider, entity_type, external_id, local_id)
    VALUES ('magicline', ?, ?, ?)
    ON DUPLICATE KEY UPDATE local_id = VALUES(local_id)
  ");
  $stmt->execute([$entityType, $externalId, $localId]);
}

function upsert_contract_raw(PDO $db, string $tenant, string $studioId, int $mlCustomerId, array $contract): void {
  $cid = (int)($contract['id'] ?? 0);
  if (!$cid) return;

  $json = json_encode($contract, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $hash = sha_payload($json);

  $stmt = $db->prepare("
    INSERT INTO ml_contracts_raw (magicline_contract_id, magicline_customer_id, tenant, studio_id, payload, payload_hash, last_seen_at, synced_at)
    VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      magicline_customer_id=VALUES(magicline_customer_id),
      payload=VALUES(payload),
      payload_hash=VALUES(payload_hash),
      last_seen_at=NOW(),
      synced_at=NOW()
  ");
  $stmt->execute([$cid, $mlCustomerId, $tenant, $studioId, $json, $hash]);
}

function import_contract(PDO $db, int $memberId, array $contract): void {
  $mlContractId = (int)($contract['id'] ?? 0);
  if (!$mlContractId) return;

  $rateName = (string)($contract['rateName'] ?? $contract['contractName'] ?? 'Magicline Import');
  $status   = (string)($contract['contractStatus'] ?? 'ACTIVE'); // ACTIVE/INACTIVE
  $start    = (string)($contract['startDate'] ?? date('Y-m-d'));
  $end      = $contract['endDate'] ?? null;

  $typeId = get_or_create_contract_type($db, $rateName, null);

  $mappedStatus = ($status === 'ACTIVE') ? 'active' : 'cancelled';

  $stmt = $db->prepare("
    INSERT INTO contracts (member_id, type_id, start_date, end_date, status, magicline_contract_id, rate_name, contract_status, magicline_snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
    ON DUPLICATE KEY UPDATE
      member_id=VALUES(member_id),
      type_id=VALUES(type_id),
      start_date=VALUES(start_date),
      end_date=VALUES(end_date),
      status=VALUES(status),
      rate_name=VALUES(rate_name),
      contract_status=VALUES(contract_status),
      magicline_snapshot=VALUES(magicline_snapshot)
  ");

  $json = json_encode($contract, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $stmt->execute([
    $memberId,
    $typeId,
    $start,
    $end,
    $mappedStatus,
    $mlContractId,
    $rateName,
    $status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    $json
  ]);
}

/* ---------------- ROUTES ---------------- */

if ($action === 'debug_log') {
  $file = log_file();
  if (!file_exists($file)) json_success(['lines'=>[]]);
  $lines = @file($file, FILE_IGNORE_NEW_LINES);
  $tail = array_slice($lines ?: [], -200);
  json_success(['lines' => $tail]);
}

if ($action === 'test_log') {
  ml_log('TEST', 'Diagnose-Schreibtest');
  json_success(['ok'=>true]);
}

if ($action === 'settings') {
  if ($method === 'GET') {
    $s = get_magicline_settings($db);
    if (!empty($s['api_key'])) $s['api_key'] = '********';
    json_success($s);
  }
  if ($method === 'POST') {
    $body = get_body();
    save_magicline_settings($db, $body);
    json_success(['ok'=>true]);
  }
  json_error('Methode nicht erlaubt', 405);
}

if ($action === 'connection_test') {
  $s = get_magicline_settings($db);
  $base = normalize_base_url((string)($s['base_url'] ?? ''));
  $key  = (string)($s['api_key'] ?? '');
  if ($base === '' || $key === '') json_error('Bitte base_url und api_key speichern.', 400);

  ml_log('INFO', 'Verbindungstest gestartet', ['base_url'=>$base, 'method'=>'HEAD /customers']);
  [$code, $body, $err] = http_req('HEAD', $base . '/customers', $key);
  ml_log('INFO', 'HEAD /customers Antwort', ['http_code'=>$code, 'curl_error'=>$err ?: 'keiner']);

  if ($code === 200) json_success(['ok'=>true,'env'=>str_contains($base,'sandbox')?'SANDBOX':'PROD']);
  if ($code === 401) json_error('API Key fehlt oder ist falsch (401).', 401);
  if ($code === 403) json_error('API Key ok, aber Scope fehlt (403).', 403);
  json_error('Verbindungstest fehlgeschlagen: HTTP '.$code, 400);
}

if ($action === 'sync_preview' || $action === 'sync_run') {
  if ($method !== 'POST') json_error('Methode nicht erlaubt', 405);

  $body = get_body();
  $nacMaster = (($body['policy'] ?? 'nac_master') === 'nac_master'); // default
  $statuses = $body['customerStatuses'] ?? ['MEMBER','PROSPECT','FORMER_MEMBER'];
  if (!is_array($statuses) || empty($statuses)) $statuses = ['MEMBER','PROSPECT','FORMER_MEMBER'];

  $modules = $body['modules'] ?? ['customers'=>true,'contracts'=>true];
  $doCustomers = (bool)($modules['customers'] ?? true);
  $doContracts = (bool)($modules['contracts'] ?? true);

  $s = get_magicline_settings($db);
  $base = normalize_base_url((string)($s['base_url'] ?? ''));
  $key  = (string)($s['api_key'] ?? '');
  $tenant = (string)($s['tenant_id'] ?? '');
  $studioId = (string)($s['studio_id'] ?? '');

  if ($tenant === '') {
    // tenant aus base_url ableiten (subdomain prefix)
    $host = parse_url($base, PHP_URL_HOST) ?: '';
    $tenant = explode('.', $host)[0] ?? '';
  }
  if ($studioId === '') $studioId = 'unknown';

  if ($base === '' || $key === '') json_error('Bitte base_url und api_key speichern.', 400);

  $dryRun = ($action === 'sync_preview');

  ml_log('INFO', $dryRun ? 'Sync PREVIEW gestartet' : 'Sync RUN gestartet', [
    'base_url'=>$base,
    'statuses'=>$statuses,
    'policy'=>$nacMaster?'nac_master(fill_empty)':'prefer_magicline',
    'modules'=>$modules
  ]);

  $stats = [
    'fetched'=>0,
    'fetched_by_status'=>['MEMBER'=>0,'PROSPECT'=>0,'FORMER_MEMBER'=>0],
    'raw_saved'=>0,
    'created'=>0,
    'updated'=>0,
    'merge_candidates_created'=>0,
    'contracts_imported'=>0,
    'contracts_raw_saved'=>0,
  ];

  $mappedMembers = []; // mlCustomerId => memberId (nur wenn wirklich importiert oder bereits linked)

  foreach ($statuses as $status) {
    if (!in_array($status, ['MEMBER','PROSPECT','FORMER_MEMBER'], true)) continue;

    $offset = null;
    $page = 0;

    while (true) {
      $qs = ['sliceSize'=>100, 'customerStatus'=>$status];
      if ($offset !== null && $offset !== '') $qs['offset'] = (string)$offset;

      $url = $base . '/customers?' . http_build_query($qs);
      [$code,$resp,$err] = http_req('GET', $url, $key);
      if ($code !== 200) {
        ml_log('ERROR','Customers fetch failed', ['url'=>$url,'http_code'=>$code,'body_head'=>substr($resp,0,300)]);
        json_error('Customers fetch failed (HTTP '.$code.')', 500);
      }

      $json = json_decode($resp, true);
      $list = $json['result'] ?? [];
      $hasNext = (bool)($json['hasNext'] ?? false);
      $offset = $json['offset'] ?? null;

      $stats['fetched'] += count($list);
      $stats['fetched_by_status'][$status] += count($list);

      ml_log('INFO', "Kunden-Seite {$page} abgerufen", ['status'=>$status,'count'=>count($list),'hasNext'=>$hasNext,'offset'=>$offset]);

      if ($doCustomers) {
        foreach ($list as $c) {
          $mlId = (int)($c['id'] ?? 0);
          if (!$mlId) continue;

          // Raw immer speichern
          if (!$dryRun) {
            upsert_raw_customer($db, $tenant, $studioId, $c);
          }
          $stats['raw_saved']++;

          // Match / Import Regeln
          $email = trim((string)($c['email'] ?? ''));
          $first = trim((string)($c['firstName'] ?? ''));
          $last  = trim((string)($c['lastName'] ?? ''));

          // 1) Schon verknüpft?
          $stmt = $db->prepare("SELECT local_id FROM external_identities WHERE provider='magicline' AND entity_type='member' AND external_id=? LIMIT 1");
          $stmt->execute([(string)$mlId]);
          $linked = $stmt->fetchColumn();
          if ($linked) {
            $mappedMembers[$mlId] = (int)$linked;
            continue;
          }

          // 2) Schon in members.magicline_id?
          $stmt = $db->prepare("SELECT id FROM members WHERE magicline_id=? LIMIT 1");
          $stmt->execute([(string)$mlId]);
          $existingByMl = $stmt->fetchColumn();
          if ($existingByMl) {
            if (!$dryRun) upsert_external_identity($db, 'member', (string)$mlId, (int)$existingByMl);
            $mappedMembers[$mlId] = (int)$existingByMl;
            continue;
          }

          // 3) Email Match
          if ($email !== '') {
            $matchId = find_member_by_email($db, $email);
            if ($matchId) {
              if (!$dryRun) create_merge_candidate($db, $mlId, 'EMAIL', $matchId, [$matchId], 90, ['email_match'=>$email]);
              $stats['merge_candidates_created']++;
              continue;
            }
          } else {
            // 4) No email -> Name Match
            $matches = find_member_by_name($db, $first, $last);
            if (count($matches) === 1) {
              if (!$dryRun) create_merge_candidate($db, $mlId, 'NAME', $matches[0], $matches, 60, ['name_match'=>"$first $last"]);
              $stats['merge_candidates_created']++;
              continue;
            }
            if (count($matches) > 1) {
              if (!$dryRun) create_merge_candidate($db, $mlId, 'MULTI', null, $matches, 40, ['multi_name_match'=>"$first $last"]);
              $stats['merge_candidates_created']++;
              continue;
            }
          }

          // 5) Import als neuer Member (Email kann NULL sein)
          if (!$dryRun) {
            $res = upsert_member($db, $c, $status, $nacMaster);
            $stats['created'] += $res['created'];
            $stats['updated'] += $res['updated'];
            $memberId = (int)($res['member_id'] ?? 0);
            if ($memberId) {
              upsert_external_identity($db, 'member', (string)$mlId, $memberId);
              $mappedMembers[$mlId] = $memberId;
            }
          } else {
            // preview: nur zählen
            $stats['created']++;
          }
        }
      }

      $page++;
      if (!$hasNext) break;
    }
  }

  // Contracts importieren (nur für gemappte Members)
  if ($doContracts) {
    foreach ($mappedMembers as $mlCustomerId => $memberId) {
      $url = $base . '/customers/' . urlencode((string)$mlCustomerId) . '/contracts';
      [$code,$resp,$err] = http_req('GET', $url, $key);
      if ($code !== 200) {
        ml_log('WARN','Contracts fetch failed', ['customer'=>$mlCustomerId,'http_code'=>$code,'body_head'=>substr($resp,0,250)]);
        continue;
      }

      $json = json_decode($resp, true);
      $contracts = $json['result'] ?? $json ?? [];
      if (!is_array($contracts)) $contracts = [];

      foreach ($contracts as $ct) {
        $stats['contracts_raw_saved']++;
        if (!$dryRun) {
          upsert_contract_raw($db, $tenant, $studioId, (int)$mlCustomerId, $ct);
          import_contract($db, (int)$memberId, $ct);
          $stats['contracts_imported']++;
          // mapping optional für contracts
          if (!empty($ct['id'])) upsert_external_identity($db, 'contract', (string)$ct['id'], (int)$ct['id']);
        }
      }
    }
  }

  // Audit log (System-Fallback)
  $auditUserId = (int)($admin['sub'] ?? $admin['id'] ?? 1);
  try {
    $stmt = $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, CAST(? AS JSON))");
    $stmt->execute([$auditUserId, $dryRun ? 'magicline_sync_preview' : 'magicline_sync_run', 'integration', json_encode($stats)]);
  } catch (Throwable $e) {
    ml_log('WARN', 'Audit-Log konnte nicht geschrieben werden', ['error'=>$e->getMessage()]);
  }

  ml_log('INFO', 'Sync abgeschlossen', $stats);
  json_success(['ok'=>true,'dryRun'=>$dryRun,'stats'=>$stats]);
}

if ($action === 'merge_candidates') {
  $stmt = $db->query("SELECT * FROM merge_candidates WHERE decision='PENDING' ORDER BY created_at DESC LIMIT 500");
  json_success(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

if ($action === 'merge_apply') {
  if ($method !== 'POST') json_error('Methode nicht erlaubt', 405);
  $body = get_body();
  $candidateId = (int)($body['candidate_id'] ?? 0);
  $do = (string)($body['action'] ?? '');
  $memberId = (int)($body['member_id'] ?? 0);

  $stmt = $db->prepare("SELECT * FROM merge_candidates WHERE id=? LIMIT 1");
  $stmt->execute([$candidateId]);
  $cand = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$cand) json_error('Candidate nicht gefunden.', 404);

  $mlId = (string)$cand['external_id'];

  // Lade Raw Customer
  $raw = $db->prepare("SELECT payload, customer_status FROM ml_customers_raw WHERE magicline_customer_id=? LIMIT 1");
  $raw->execute([(int)$mlId]);
  $row = $raw->fetch(PDO::FETCH_ASSOC);
  if (!$row) json_error('Raw Customer nicht gefunden. Bitte Sync erneut ausführen.', 400);
  $customer = json_decode($row['payload'], true) ?: [];
  $status = (string)($row['customer_status'] ?? 'MEMBER');

  if ($do === 'link') {
    if ($memberId <= 0) json_error('member_id fehlt.', 400);

    // Safety: member darf nicht schon andere magicline_id haben (optional)
    $q = $db->prepare("SELECT magicline_id FROM members WHERE id=? LIMIT 1");
    $q->execute([$memberId]);
    $existingMl = $q->fetchColumn();
    if ($existingMl && (string)$existingMl !== (string)$mlId) {
      json_error('Dieser Member ist bereits mit einem anderen Magicline-Kunden verknüpft.', 409);
    }

    // Link: magicline_id setzen + external_identities
    $u = $db->prepare("UPDATE members SET magicline_id=?, magicline_customer_status=?, magicline_synced_at=NOW() WHERE id=?");
    $u->execute([(string)$mlId, $status, $memberId]);
    upsert_external_identity($db, 'member', (string)$mlId, $memberId);

    // Contracts nachziehen
    $s = get_magicline_settings($db);
    $base = normalize_base_url((string)($s['base_url'] ?? ''));
    $key  = (string)($s['api_key'] ?? '');
    $tenant = (string)($s['tenant_id'] ?? '');
    $studioId = (string)($s['studio_id'] ?? 'unknown');

    if ($tenant === '') {
      $host = parse_url($base, PHP_URL_HOST) ?: '';
      $tenant = explode('.', $host)[0] ?? '';
    }

    $url = $base . '/customers/' . urlencode((string)$mlId) . '/contracts';
    [$code,$resp,$err] = http_req('GET', $url, $key);
    if ($code === 200) {
      $json = json_decode($resp, true);
      $contracts = $json['result'] ?? $json ?? [];
      if (is_array($contracts)) {
        foreach ($contracts as $ct) {
          upsert_contract_raw($db, $tenant, $studioId, (int)$mlId, $ct);
          import_contract($db, $memberId, $ct);
        }
      }
    }

    $upd = $db->prepare("UPDATE merge_candidates SET decision='LINKED', decided_by=?, decided_at=NOW() WHERE id=?");
    $upd->execute([(int)($admin['sub'] ?? 1), $candidateId]);

    json_success(['ok'=>true,'decision'=>'LINKED']);
  }

  if ($do === 'create') {
    // Neuen Member anlegen aus Raw
    $res = upsert_member($db, $customer, $status, true);
    $newId = (int)($res['member_id'] ?? 0);
    if (!$newId) json_error('Member konnte nicht angelegt werden.', 500);
    upsert_external_identity($db, 'member', (string)$mlId, $newId);

    $upd = $db->prepare("UPDATE merge_candidates SET decision='CREATED', decided_by=?, decided_at=NOW() WHERE id=?");
    $upd->execute([(int)($admin['sub'] ?? 1), $candidateId]);

    json_success(['ok'=>true,'decision'=>'CREATED','member_id'=>$newId]);
  }

  json_error('Ungültige action. Nutze link|create.', 400);
}

if ($action === 'merge_ignore') {
  if ($method !== 'POST') json_error('Methode nicht erlaubt', 405);
  $body = get_body();
  $candidateId = (int)($body['candidate_id'] ?? 0);

  $upd = $db->prepare("UPDATE merge_candidates SET decision='IGNORED', decided_by=?, decided_at=NOW() WHERE id=?");
  $upd->execute([(int)($admin['sub'] ?? 1), $candidateId]);

  json_success(['ok'=>true]);
}

json_error('Ungültige Anfrage', 400);
<?php
/**
 * api/member/upload.php
 * Sicherer Datei-Upload für Atteste und Kündigungsdokumente (DSGVO-konform).
 */
declare(strict_types=1);
require_once '../config.php';

$user = require_auth();
if (!$user['member_id']) json_error('Nur für Mitglieder', 403);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
        json_error('Keine Datei hochgeladen oder Upload-Fehler.');
    }

    $file          = $_FILES['document'];
    $allowed_types = ['application/pdf', 'image/jpeg', 'image/png'];
    $max_size      = 5 * 1024 * 1024; // 5 MB

    // 1. Validierung
    $mime_type = mime_content_type($file['tmp_name']);
    if (!in_array($mime_type, $allowed_types, true)) {
        json_error('Ungültiges Dateiformat. Nur PDF, JPG und PNG sind erlaubt.');
    }

    if ($file['size'] > $max_size) {
        json_error('Datei ist zu groß (maximal 5 MB).');
    }

    // 2. Sicheren Dateinamen generieren
    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    // Format: memberId_timestamp_random.ext  (z. B. 4_1708781234_a1b2.pdf)
    $filename = sprintf('%d_%d_%s.%s', $user['member_id'], time(), bin2hex(random_bytes(4)), $ext);

    // 3. Speichern
    $upload_dir = __DIR__ . '/../uploads/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $target_path = $upload_dir . $filename;

    if (move_uploaded_file($file['tmp_name'], $target_path)) {
        // Relativer öffentlicher Pfad (z. B. /api/uploads/4_170878_a1b2.pdf)
        $public_url = '/api/uploads/' . $filename;
        json_success(['success' => true, 'url' => $public_url]);
    } else {
        json_error('Fehler beim Speichern der Datei.', 500);
    }
}

json_error('Methode nicht erlaubt', 405);

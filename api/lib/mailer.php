<?php
/**
 * mailer.php – SMTP E-Mail Helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Nutzt die in smtp_settings gespeicherte Konfiguration.
 * Sendet E-Mails via PHP fsockopen (raw SMTP) – kein PHPMailer noetig.
 *
 * Verwendung:
 *   require_once __DIR__ . '/lib/mailer.php';
 *   $result = nac_send_mail('empfaenger@email.de', 'Betreff', '<h1>Hallo</h1>');
 *   if ($result['success']) { ... } else { echo $result['error']; }
 */

require_once __DIR__ . '/../config.php';

/**
 * Laedt SMTP-Settings aus der Datenbank.
 * @return array|null
 */
function nac_get_smtp_settings(): ?array
{
    try {
        $pdo = db();
        $stmt = $pdo->query("SELECT * FROM smtp_settings WHERE id = 1 LIMIT 1");
        return $stmt->fetch() ?: null;
    } catch (PDOException $e) {
        return null;
    }
}

/**
 * SMTP-Verbindungstest – Prueft ob der Server erreichbar ist und Auth klappt.
 * @return array{success: bool, message: string, details?: string}
 */
function nac_test_smtp(): array
{
    $cfg = nac_get_smtp_settings();
    if (!$cfg) {
        return ['success' => false, 'message' => 'Keine SMTP-Einstellungen in der Datenbank gefunden.'];
    }
    if (empty($cfg['smtp_host'])) {
        return ['success' => false, 'message' => 'SMTP-Host ist nicht konfiguriert.'];
    }

    $host    = $cfg['smtp_host'];
    $port    = (int)$cfg['smtp_port'];
    $user    = $cfg['smtp_user'];
    $pass    = $cfg['smtp_pass'];
    $enc     = $cfg['smtp_encryption'];

    $prefix = '';
    if ($enc === 'ssl') {
        $prefix = 'ssl://';
    }

    $log = [];

    // Verbindung oeffnen
    $errno  = 0;
    $errstr = '';
    $timeout = 10;

    $log[] = "Verbinde mit {$prefix}{$host}:{$port} ...";
    $fp = @fsockopen($prefix . $host, $port, $errno, $errstr, $timeout);
    if (!$fp) {
        return [
            'success' => false,
            'message' => "Verbindung fehlgeschlagen: {$errstr} (Code {$errno})",
            'details' => implode("\n", $log),
        ];
    }

    stream_set_timeout($fp, $timeout);

    // Greeting lesen
    $greeting = fgets($fp, 512);
    $log[] = "Server: " . trim($greeting);

    if (substr($greeting, 0, 3) !== '220') {
        fclose($fp);
        return [
            'success' => false,
            'message' => 'Unerwartete Server-Antwort: ' . trim($greeting),
            'details' => implode("\n", $log),
        ];
    }

    // EHLO
    $ehlo = "EHLO " . gethostname() . "\r\n";
    fwrite($fp, $ehlo);
    $log[] = ">> EHLO " . gethostname();
    $resp = '';
    while ($line = fgets($fp, 512)) {
        $resp .= $line;
        if (substr($line, 3, 1) === ' ') break;
    }
    $log[] = "Server: " . trim($resp);

    // STARTTLS wenn noetig
    if ($enc === 'tls') {
        fwrite($fp, "STARTTLS\r\n");
        $log[] = ">> STARTTLS";
        $resp = fgets($fp, 512);
        $log[] = "Server: " . trim($resp);

        if (substr($resp, 0, 3) !== '220') {
            fclose($fp);
            return [
                'success' => false,
                'message' => 'STARTTLS fehlgeschlagen: ' . trim($resp),
                'details' => implode("\n", $log),
            ];
        }

        // TLS handshake
        $crypto = stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if (!$crypto) {
            fclose($fp);
            return [
                'success' => false,
                'message' => 'TLS-Handshake fehlgeschlagen.',
                'details' => implode("\n", $log),
            ];
        }
        $log[] = "TLS-Handshake erfolgreich.";

        // Erneutes EHLO nach STARTTLS
        fwrite($fp, $ehlo);
        $log[] = ">> EHLO (nach TLS)";
        $resp = '';
        while ($line = fgets($fp, 512)) {
            $resp .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        $log[] = "Server: " . trim($resp);
    }

    // AUTH LOGIN
    if (!empty($user) && !empty($pass)) {
        fwrite($fp, "AUTH LOGIN\r\n");
        $log[] = ">> AUTH LOGIN";
        $resp = fgets($fp, 512);
        $log[] = "Server: " . trim($resp);

        if (substr($resp, 0, 3) !== '334') {
            fclose($fp);
            return [
                'success' => false,
                'message' => 'AUTH LOGIN nicht unterstuetzt: ' . trim($resp),
                'details' => implode("\n", $log),
            ];
        }

        fwrite($fp, base64_encode($user) . "\r\n");
        $log[] = ">> [Benutzername]";
        $resp = fgets($fp, 512);
        $log[] = "Server: " . trim($resp);

        if (substr($resp, 0, 3) !== '334') {
            fclose($fp);
            return [
                'success' => false,
                'message' => 'Benutzername abgelehnt: ' . trim($resp),
                'details' => implode("\n", $log),
            ];
        }

        fwrite($fp, base64_encode($pass) . "\r\n");
        $log[] = ">> [Passwort]";
        $resp = fgets($fp, 512);
        $log[] = "Server: " . trim($resp);

        if (substr($resp, 0, 3) !== '235') {
            fclose($fp);
            return [
                'success' => false,
                'message' => 'Authentifizierung fehlgeschlagen: ' . trim($resp),
                'details' => implode("\n", $log),
            ];
        }
        $log[] = "Authentifizierung erfolgreich!";
    }

    // QUIT
    fwrite($fp, "QUIT\r\n");
    fclose($fp);
    $log[] = "Verbindung getrennt.";

    // Last test timestamp aktualisieren
    try {
        $pdo = db();
        $pdo->exec("UPDATE smtp_settings SET last_test_at = NOW(), last_test_ok = 1 WHERE id = 1");
    } catch (PDOException $e) { /* ignore */ }

    return [
        'success' => true,
        'message' => 'SMTP-Verbindung erfolgreich! Authentifizierung OK.',
        'details' => implode("\n", $log),
    ];
}

/**
 * Sendet eine E-Mail via SMTP.
 *
 * @param string $to       Empfaenger E-Mail
 * @param string $subject  Betreff
 * @param string $body     HTML-Body
 * @param array  $options  Optionale Einstellungen: reply_to, cc, bcc
 * @return array{success: bool, error?: string}
 */
function nac_send_mail(string $to, string $subject, string $body, array $options = []): array
{
    $cfg = nac_get_smtp_settings();
    if (!$cfg || !(bool)$cfg['is_active']) {
        return ['success' => false, 'error' => 'SMTP ist nicht aktiv oder nicht konfiguriert.'];
    }

    $host      = $cfg['smtp_host'];
    $port      = (int)$cfg['smtp_port'];
    $user      = $cfg['smtp_user'];
    $pass      = $cfg['smtp_pass'];
    $enc       = $cfg['smtp_encryption'];
    $fromEmail = $cfg['from_email'];
    $fromName  = $cfg['from_name'] ?: 'Nice Athletic Club';
    $replyTo   = $options['reply_to'] ?? $cfg['reply_to_email'] ?? '';

    if (empty($host) || empty($fromEmail)) {
        return ['success' => false, 'error' => 'SMTP-Konfiguration unvollstaendig.'];
    }

    $prefix = ($enc === 'ssl') ? 'ssl://' : '';
    $fp = @fsockopen($prefix . $host, $port, $errno, $errstr, 10);
    if (!$fp) {
        return ['success' => false, 'error' => "SMTP-Verbindung fehlgeschlagen: {$errstr}"];
    }

    stream_set_timeout($fp, 10);

    // Helper: Antwort lesen und Code pruefen
    $readResponse = function() use ($fp): string {
        $resp = '';
        while ($line = fgets($fp, 512)) {
            $resp .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        return $resp;
    };

    $sendCmd = function(string $cmd, string $expectedCode) use ($fp, $readResponse): ?string {
        fwrite($fp, $cmd . "\r\n");
        $resp = $readResponse();
        if (substr($resp, 0, 3) !== $expectedCode) {
            return "Unerwartete Antwort auf '{$cmd}': " . trim($resp);
        }
        return null;
    };

    // Greeting
    $readResponse();

    // EHLO
    $hostname = gethostname() ?: 'localhost';
    fwrite($fp, "EHLO {$hostname}\r\n");
    $readResponse();

    // STARTTLS
    if ($enc === 'tls') {
        fwrite($fp, "STARTTLS\r\n");
        $resp = fgets($fp, 512);
        if (substr($resp, 0, 3) !== '220') {
            fclose($fp);
            return ['success' => false, 'error' => 'STARTTLS fehlgeschlagen.'];
        }
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($fp);
            return ['success' => false, 'error' => 'TLS-Handshake fehlgeschlagen.'];
        }
        fwrite($fp, "EHLO {$hostname}\r\n");
        $readResponse();
    }

    // AUTH
    if (!empty($user) && !empty($pass)) {
        fwrite($fp, "AUTH LOGIN\r\n");
        $resp = $readResponse();
        if (substr($resp, 0, 3) !== '334') {
            fclose($fp);
            return ['success' => false, 'error' => 'AUTH LOGIN nicht unterstuetzt.'];
        }
        fwrite($fp, base64_encode($user) . "\r\n");
        $resp = $readResponse();
        fwrite($fp, base64_encode($pass) . "\r\n");
        $resp = $readResponse();
        if (substr($resp, 0, 3) !== '235') {
            fclose($fp);
            return ['success' => false, 'error' => 'SMTP-Authentifizierung fehlgeschlagen.'];
        }
    }

    // MAIL FROM
    $err = $sendCmd("MAIL FROM:<{$fromEmail}>", '250');
    if ($err) { fclose($fp); return ['success' => false, 'error' => $err]; }

    // RCPT TO
    $err = $sendCmd("RCPT TO:<{$to}>", '250');
    if ($err) { fclose($fp); return ['success' => false, 'error' => $err]; }

    // DATA
    $err = $sendCmd("DATA", '354');
    if ($err) { fclose($fp); return ['success' => false, 'error' => $err]; }

    // Headers + Body
    $boundary = md5(uniqid(time()));
    $headers  = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>\r\n";
    $headers .= "To: <{$to}>\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    if (!empty($replyTo)) {
        $headers .= "Reply-To: <{$replyTo}>\r\n";
    }
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: base64\r\n";
    $headers .= "X-Mailer: NAC-EMS/1.0\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "\r\n";
    $headers .= chunk_split(base64_encode($body));
    $headers .= "\r\n.\r\n";

    fwrite($fp, $headers);
    $resp = $readResponse();
    if (substr($resp, 0, 3) !== '250') {
        fclose($fp);
        return ['success' => false, 'error' => 'Mail-Versand fehlgeschlagen: ' . trim($resp)];
    }

    fwrite($fp, "QUIT\r\n");
    fclose($fp);

    return ['success' => true];
}

/**
 * Sendet eine Test-E-Mail an die angegebene Adresse.
 * @param string $toEmail
 * @return array{success: bool, message: string}
 */
function nac_send_test_mail(string $toEmail): array
{
    $cfg = nac_get_smtp_settings();
    $fromName = $cfg['from_name'] ?: 'Nice Athletic Club';

    $html = '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#050505;color:#ffffff;padding:40px;">
  <div style="max-width:500px;margin:0 auto;background:#121212;border:1px solid rgba(255,255,255,0.1);padding:32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#CA0C85;color:#fff;padding:8px 20px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">
        SMTP Verbindungstest
      </div>
    </div>
    <h2 style="font-size:20px;margin:0 0 12px;text-align:center;">E-Mail-Zustellung erfolgreich!</h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;text-align:center;">
      Diese Test-E-Mail wurde vom <strong>' . htmlspecialchars($fromName) . '</strong> System gesendet.
      Wenn du diese Nachricht lesen kannst, funktioniert die SMTP-Konfiguration einwandfrei.
    </p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
    <p style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;">
      Gesendet am ' . date('d.m.Y \u\m H:i') . ' Uhr via NAC EMS
    </p>
  </div>
</body>
</html>';

    // Temporaer aktivieren fuer Test
    $wasActive = $cfg['is_active'] ?? false;
    if (!$wasActive) {
        try {
            $pdo = db();
            $pdo->exec("UPDATE smtp_settings SET is_active = 1 WHERE id = 1");
        } catch (PDOException $e) { /* ignore */ }
    }

    $result = nac_send_mail($toEmail, 'NAC SMTP Test – ' . date('H:i:s'), $html);

    // Wieder deaktivieren wenn vorher inaktiv
    if (!$wasActive) {
        try {
            $pdo = db();
            $pdo->exec("UPDATE smtp_settings SET is_active = 0 WHERE id = 1");
        } catch (PDOException $e) { /* ignore */ }
    }

    if ($result['success']) {
        return ['success' => true, 'message' => "Test-E-Mail erfolgreich an {$toEmail} gesendet!"];
    }
    return ['success' => false, 'message' => $result['error'] ?? 'Unbekannter Fehler beim Versand.'];
}

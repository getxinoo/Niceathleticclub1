# NAC PHP-API – Deployment auf Checkdomain

## Struktur auf dem Server (nicefitness.de)

```
/api/
  cors.php           ← Muss ALS ERSTES deployed werden
  config.php         ← DB-Zugangsdaten (aus config.example.php ableiten)
  login.php          ← ✅ Bereits deployed
  pages.php          ← NEU – Sitebuilder Block-Storage
  press.php          ← ✅ Bereits im Repo
  team.php           ← Muss erstellt werden
  kurse.php          ← Muss erstellt werden
  leads.php          ← Muss erstellt werden
  tarife.php         ← Muss erstellt werden
  pricing.php        ← Muss erstellt werden
  reviews.php        ← Muss erstellt werden
  karriere.php       ← Muss erstellt werden
  absences.php       ← Muss erstellt werden
  bookings.php       ← Muss erstellt werden
  onboard.php        ← Muss erstellt werden
  /admin/
    members.php      ← ✅ Bereits deployed
    finances.php     ← Muss erstellt werden
    settings.php     ← Muss erstellt werden
    audit_logs.php   ← Muss erstellt werden
    users.php        ← Muss erstellt werden
    requests.php     ← Muss erstellt werden
    page-visibility.php ← Muss erstellt werden
    coaching.php     ← Muss erstellt werden
    bookings.php     ← Muss erstellt werden
    integrations.php ← Muss erstellt werden
    smtp.php         ← Muss erstellt werden
    tracking.php     ← Muss erstellt werden
  /member/
    profile.php      ← Muss erstellt werden
    stats.php        ← Muss erstellt werden
    contracts.php    ← Muss erstellt werden
    sepa.php         ← Muss erstellt werden
    tracking.php     ← Muss erstellt werden
    coaching.php     ← Muss erstellt werden
    sessions.php     ← Muss erstellt werden
    bookings.php     ← Muss erstellt werden
  /public/
    settings.php     ← Muss erstellt werden
    page-visibility.php ← Muss erstellt werden
    pricing.php      ← Muss erstellt werden
```

## Sofort-Deployment (Priorität 1)

Diese 3 Dateien JETZT auf den Server:

1. `cors.php` → `/api/cors.php`
2. `pages.php` → `/api/pages.php`
3. `config.php` (aus config.example.php ableiten) → `/api/config.php`

## Datenbank-Tabelle für pages.php anlegen

```sql
CREATE TABLE IF NOT EXISTS page_blocks (
    slug        VARCHAR(120) NOT NULL,
    blocks_json MEDIUMTEXT   NOT NULL,
    published   TINYINT(1)   NOT NULL DEFAULT 1,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## CORS-Diagnose

Wenn CORS-Fehler auftreten:
1. Prüfe ob cors.php deployed ist: https://nicefitness.de/api/cors.php
2. Prüfe ob die Domain in $allowedPatterns steht
3. In Figma Make Preview läuft die App auf einer *.figma-make.com Domain

## Checkdomain-Einschränkungen (PHP 7.4 / MySQL 5.7)

- ❌ str_contains() verboten → strpos() verwenden
- ❌ INFORMATION_SCHEMA gesperrt
- ❌ ADD COLUMN IF NOT EXISTS nicht unterstützt
- ❌ Mehrere Spalten in einer ALTER TABLE → separate Statements
- ✅ PDO mit UTF8mb4 korrekt konfiguriert (in config.php)

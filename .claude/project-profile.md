# Projektprofil: niceathleticclub1
Projektspezifische Ergänzungen zur XINOO-Basis (`.claude/XINOO_BASIS.md`). **Entwurf vom 26.11.2026**, erstellt aus der Repo-Lektüre; bitte prüfen und ergänzen. Die bestehenden Projektregeln (`README.md`, `AI_HANDOFF_ADMIN_CMS.md`, `SECURITY_REMEDIATION_PLAN.md`, `CREDENTIAL_ROTATION_RUNBOOK.md`, `guidelines/Guidelines.md`) gehen diesem Profil und den Basis-Skills vor.

## Projekt
- Nice Athletic Club: Website, Admin/CMS und Kundenbereich (React/Vite-Frontend aus Figma Make, PHP-API unter `api/`). Öffentliches Repository.
- Weitere Angaben (Domain, Staging, Mandant, Freigabeberechtigte): offen.

## Befehle
- `npm run build`, `npm run predeploy:check`, `node --test scripts/security-acceptance.test.mjs`, `node scripts/validate-sql.mjs`; `php -l` für geänderte PHP-Dateien.

## Projektrollen
- Keine eigenen Skills. Sicherheitsplan und Rotations-Runbook im Repo gehen vor.

## Installierte Basisrollen
- `code-quality-review`, `pre-pr-verification`, `privacy-security`, `qa-review`, `frontend-engineering`, `ui-design-system`, `accessibility`, `performance`, `technical-seo`, `api-cms-contracts`, `brand-law`, `marketing-law`. Weitere Basisrollen können aus der XINOO-Basis ergänzt werden.

## ui-design-system
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## frontend-engineering
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## api-cms-contracts
API-Endpunkte unter `api/`; Admin-/CMS-Übergabe in `AI_HANDOFF_ADMIN_CMS.md`.

## technical-seo
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## accessibility
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## performance
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## privacy-security
Öffentliches Repository. Zusätzliche P0-Regeln: `api/config.php` und Datenbank-Dumps nie committen (nur `api/config.example.php` mit Platzhaltern); keine Mitglieder-, Lead- oder Rechnungsdaten im Repo; keine Serveradressen oder Zugangsdaten in Code, Doku oder Profil. Offene Altlasten laut `SECURITY_REMEDIATION_PLAN.md` vor jedem Release prüfen.

## brand-law
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## marketing-law
Preise, Tarife und Probetraining-Angebote mit Pflichtangaben (PAngV) prüfen.

## qa-review
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## code-quality-review
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

## pre-pr-verification
Keine Projektergänzungen bisher; es gilt der Basis-Skill. Quellen: offen.

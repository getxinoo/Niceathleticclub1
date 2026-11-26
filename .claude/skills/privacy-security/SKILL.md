---
name: privacy-security
description: "Sicherheit und Datenschutz: Threat Model, Datenfluss- und Datenschutzinventar, Prüfung von Secrets, Eingaben, Links, Headern, Consent und Mandantenisolation. Use when code handles input, external links, auth, personal data, tracking, secrets or tenant boundaries. Not for attacking third-party systems."
---
# Security, IAM & Privacy Architect
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## privacy-security` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Threat Model: Werte, Angreifer, Vertrauensgrenzen (Client, Server/SSR, CMS, Feeds, Drittanbieter, Mandanten); Multi-Tenant-Isolation ausdrücklich prüfen.
2. Datenschutzinventar: welche personenbezogenen Daten, Zweck, Rechtsgrundlage, Speicherort, Löschung, Consent (DSGVO, TDDDG).
3. Technische Prüfung: XSS, CSRF bei zustandsändernden Aktionen, SSRF bei serverseitigen Abrufen, IDOR/Objektberechtigung, Rollen und Rechte (RBAC), Session-Handling, CORS und CSP, Secret-Handling, Abhängigkeiten. Frontend-Muster im Detail in `references/frontend-review.md`.
4. Nur autorisierte Testressourcen und Testdaten; keine Tests gegen fremde Dienste.
5. Kritischer Fund: belegen, Betreiber sofort informieren, Rotation empfehlen; keine eigenmächtigen Server- oder Zugangsänderungen.

## Typische Fehler
Öffentliche Umgebungsvariablen mit geheimen Werten · Tracking vor Consent · personenbezogene Daten in URLs oder Logs · Mandanten-ID aus dem Client vertraut · Sicherheitsheader direkt auf globalem Server geändert.

## Ergebnis
Threat Model, Datenschutzinventar, Security-Review mit Nachweisen, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

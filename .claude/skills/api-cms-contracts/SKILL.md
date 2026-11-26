---
name: api-cms-contracts
description: "API- und CMS-Verträge: ermittelt echte Schnittstellen und Inhaltsquellen, mappt sie auf typisierte Adapter und testet sie. Use when connecting frontend to APIs, CMS content or data contracts. Not for inventing endpoints or building new backends."
---
# API & CMS Integration Engineer
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## api-cms-contracts` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Echte Verträge ermitteln (bestehende APIs, CMS-Publishing, Auth, Mandantenkontext). OpenAPI-Entwürfe sind Entwurf, kein Vertrag.
2. Mapping: DTO → Domänentyp, Pflichtfelder, Einheiten, Locale, Pagination, Sortierung, Fehlercodes, Timeouts, Stale-Verhalten.
3. Typisierter Adapter mit Prüfung an der Grenze; unbekannt bleibt unbekannt (nicht 0, kein Platzhalter).
4. Fixture-Adapter, solange kein bestätigter Vertrag existiert, mit demselben Interface.
5. Vertragstests: gültige, unvollständige, fehlerhafte und verspätete Antworten.

## Typische Fehler
Erfundene Endpunkte oder Felder · Mandanten-ID aus dem Client vertraut · fehlende Timeouts · Fehlerdetails an Nutzer durchgereicht · neue Datenbank oder neues CMS ohne Freigabe.

## Ergebnis
Contract-Mapping, typisierter Adapterplan, Vertragstests, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

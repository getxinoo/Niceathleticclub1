---
name: technical-seo
description: "Technisches SEO: prüft Crawlbarkeit, Indexierung, Roh-HTML, Canonicals, Sitemaps, hreflang, URL-Policy und strukturierte Daten. Use when building or reviewing pages, routes, metadata, sitemaps or JSON-LD. Not for keyword copywriting (use content-marketing)."
---
# Technical SEO & International Search Specialist
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## technical-seo` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Erst die echte Seite lesen: Roh-HTML ohne JavaScript (Titel, Meta, h1, Inhalte, echte Links, Statuscode, Canonical).
2. Crawl/Index: robots.txt, meta-robots (Staging bewusst `noindex`, Produktion nicht), Canonical ohne Schleifen, Redirect-Ketten, interne Links, Sitemap = beabsichtigte öffentliche Fläche.
3. International: Locale-URLs, hreflang nur für reale Pendants inkl. x-default nach Projektvorgabe.
4. Parameter- und Filter-URLs: Indexierungsstrategie (indexierbar, Canonical, noindex) festlegen.
5. Strukturierte Daten nur für sichtbaren Inhalt und passend zum Geschäftsmodell (siehe Projektprofil).
6. Vollständige Prüfliste in `references/audit-checklist.md`.

## Typische Fehler
SEO-Aussagen ohne Roh-HTML-Prüfung · doppelte Titel · Schema für nicht vorhandene Inhalte · erfundene Bewertungen · dünne Seiten durch Filterkombinationen · Ranking-Versprechen.

## Ergebnis
SEO-ADR, Crawl-/HTML-Audit, URL-Policy, Tests der strukturierten Daten, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

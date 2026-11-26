# SEO-Audit-Prüfliste (Ergänzung zu technical-seo)
Nur bei Bedarf lesen. SEO-Vorgaben aus dem Projektprofil haben Vorrang. Keine SEO-Folklore, keine manipulativen Muster, keine Ranking-Versprechen; jede Empfehlung an eine konkrete Datei oder URL binden und erst die echte Seite (Roh-HTML) lesen.

## P0 Crawl/Index
Wichtige Seiten nicht versehentlich `noindex` (Staging bewusst `noindex`, Produktion nicht); robots.txt blockiert keine wichtigen Seiten; Canonical selbstkonsistent, ohne Schleifen und auf 200-Ziel; keine Redirect-Ketten über zwei Sprünge; keine kaputten internen Links auf Kernpfaden (laut Projektprofil).

## P1 Seitenbasis
Eindeutiger `title` je Seite (etwa 50–60 Zeichen, Hauptthema vorn, Format „Thema – Präzisierung | Marke“); ehrliche Meta-Description (etwa 120–160 Zeichen); genau eine h1, logische h2/h3; JSON-LD für Kernseitentypen gültig und nur für tatsächlich sichtbaren Inhalt.

## Strukturierte Daten
Typ passend zum Geschäftsmodell (Details im Projektprofil): Organisation/Website auf der Startseite, `Article` für redaktionelle Seiten, `BreadcrumbList` für Hierarchien, Produktseiten mit `Product`; Verkäuferseiten mit `offers` als `Offer`, Vergleichs- und Vermittlerseiten mit `offers` als `AggregateOffer` (Preisspanne, Anzahl) bzw. `Offer` je Händler mit dem Händler als `seller`, nie die Plattform selbst als Verkäufer; Varianten über `ProductGroup` mit `hasVariant`. `FAQPage` nur bei echtem FAQ-Inhalt. Keine erfundenen Bewertungen. Werte im JSON-LD müssen zum sichtbaren Inhalt passen; bei statischem Export auf eingefrorene Werte achten.

## P2 Inhalt und Struktur
Dünne oder fast doppelte Seiten (Filterkombinationen, Affiliate-Duplikate) konsolidieren oder per Canonical/noindex steuern; ein Hauptthema je URL, Kannibalisierung vermeiden; beschreibende Ankertexte; keine verwaisten Seiten; Alt-Texte; Core Web Vitals als Laborwert getrennt von Feldwerten (LCP < 2,5 s, INP < 200 ms, CLS < 0,1).

## Findings-Format
```
[P0–P3] Titel
Ort: Datei:Zeile oder URL
Befund: was falsch ist und warum es zählt
Maßnahme: genaue Änderung
Prüfergebnis: PASS / FAIL / NOT RUN
```

<!-- Teilweise übernommen und angepasst aus ECC (skills/seo, agents/seo-specialist), MIT-Lizenz, siehe .claude/THIRD_PARTY_NOTICES.md -->

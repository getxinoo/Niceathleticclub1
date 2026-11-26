---
name: marketing-law
description: "Werbe- und Verbraucherrecht (technische Prüfung): prüft Preisangaben, Werbeaussagen, Kennzeichnung von Werbung und Affiliate-Links, Pflichtangaben und Ranking-Transparenz. Use when prices, discounts, claims, rankings, ads, affiliate links or legal pages are shown. Not a legal approval."
---
# Consumer, Advertising & Affiliate Compliance Reviewer
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## marketing-law` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Anwendbares Recht je Zielmarkt benennen (z. B. DE/EU: UWG, PAngV, DDG, DSA, Verbraucherrecht; weitere Märkte laut Projektprofil) und aktuelle Fassung prüfen.
2. UI-Prüfung: Preisangaben (Gesamtpreis, Versand, Referenzpreise), Rabatt- und Vergleichsaussagen mit belegter Basis, Werbung/Affiliate erkennbar, Ranking-Kriterien transparent, Pflichtseiten vorhanden.
3. Jede Aussage einer konkreten Stelle in der UI zuordnen; Launch-Blocker klar markieren.

## Typische Fehler
„Tiefstpreis“ oder Prozentrabatt ohne belegte Vergleichsbasis · künstliche Dringlichkeit · nicht gekennzeichnete bezahlte Platzierung · erfundene Betreiberangaben im Impressum · Rechtsprüfung als anwaltliche Freigabe ausgegeben.

## Ergebnis
Compliance-Matrix mit konkreten UI-Findings und Launch-Blockern, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

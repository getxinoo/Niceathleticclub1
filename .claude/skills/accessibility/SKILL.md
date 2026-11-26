---
name: accessibility
description: "Barrierefreiheit: prüft und begleitet UI auf WCAG 2.2 AA als technisches Ziel (Semantik, Tastatur, Fokus, Kontrast, Screenreader, Formulare, Bewegung). Use when building or reviewing interactive UI, forms, dialogs, charts or contrast. Not for legal conformity statements."
---
# Accessibility & Inclusive UX Specialist
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## accessibility` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Automatisch prüfen (axe o. Ä.), dann zwingend manuell: Tastatur, Fokus, Screenreader, Zoom/Reflow, Kontrast, Zielgrößen, reduzierte Bewegung.
2. Je Komponente die Prüfliste in `references/web-patterns.md` abarbeiten.
3. Anwendbarkeit gesetzlicher Pflichten (z. B. BFSG) gesondert benennen, nicht selbst entscheiden.
4. Findings mit Reproduktionsschritten (Gerät, Browser, Hilfsmittel).

## Typische Fehler
„Barrierefrei“ nur aus axe abgeleitet · klickbare Container ohne Rolle/Tastatur · Platzhalter statt Label · Bedeutung nur über Farbe · Fokus verschwindet hinter Sticky-Elementen · Dialog ohne Fokusführung.

## Ergebnis
A11y-Audit mit Reproduktionsschritten und Prioritäten, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

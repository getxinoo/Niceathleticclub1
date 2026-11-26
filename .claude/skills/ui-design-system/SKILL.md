---
name: ui-design-system
description: "UI und Designsystem: verantwortet Tokens, Komponentenvertrag, Zustandsmatrix und responsive Layouts. Use when building or reviewing UI components, tokens, layouts or visual states. Not for brand strategy or business logic."
---
# Senior UI & Design System Engineer
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## ui-design-system` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Tokens (Farbe, Typo, Abstände, Radien, Schatten, Bewegung) als einzige Quelle; Werte aus dem Projektprofil bzw. der Token-Datei.
2. Komponentenvertrag je Komponente: Zweck, Props, Varianten, Zustände (Standard, Hover, Fokus, Aktiv, Deaktiviert, Laden, Leer, Fehler), Barrierefreiheitsrolle.
3. Responsive an den Breakpoints aus dem Projektprofil prüfen (Standard: 320/390/768/1280/1440 px); lange Texte, Übersetzungen, große Zahlen.
4. Interaktionslogik: Fokus, Touch-Ziele, Sheets/Dialoge, progressive disclosure.
5. Abweichungen immer an echten Screenshots belegen.

## Typische Fehler
Doppelte Komponenten für dasselbe · Inline-Werte statt Tokens · fehlender Fokus- oder Fehlerzustand · Layout bricht bei 320 px oder langem Text · überladener Hero.

## Ergebnis
Token- und Komponenten-Inventar, Zustandsmatrix, responsive Screenshots, UI-Abweichungen, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

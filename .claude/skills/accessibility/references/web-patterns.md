# A11y-Prüfmuster für Web und React Native Web (Ergänzung zu accessibility)
Nur bei Bedarf lesen. Ziel WCAG 2.2 AA als technisches Ziel; keine Konformitätsbehauptung aus automatischen Tests (axe deckt nur einen Teil ab, Tastatur- und Screenreader-Prüfung bleiben manuell).

## Semantik
- Interaktives immer als echtes Bedienelement: `Pressable`/`<button>`-Äquivalent mit `role="button"` bzw. Link mit echter URL (`href`), nie klickbares `View`/`div` ohne Rolle, Fokus und Enter/Leertaste.
- Navigation über Links, damit Rechtsklick, Mittelklick und Crawler funktionieren.
- Überschriften ohne Sprünge (h1 → h2 → h3), genau eine h1 je Seite.
- Suche als `role="search"`-Bereich mit sichtbarem oder programmatisch verbundenem Label; Platzhalter ersetzt kein Label.

## Formulare
Label programmatisch verbunden; Pflichtfelder als Pflicht ausgezeichnet, Sternchen nur dekorativ; Fehlermeldung mit dem Feld verknüpft (`aria-describedby`), Feld als ungültig markiert, Meldung als Live-Region; Fehlertext mit Korrekturhinweis (SC 3.3.3).

## ARIA sparsam
Nur wenn native Semantik nicht reicht; falsches ARIA ist schlimmer als keines. Icon-Buttons brauchen einen Namen; dekorative Icons/Bilder ausblenden (`alt=""`). Aufklapper mit `aria-expanded` und `aria-controls`. Status-Updates (z. B. Ergebnisanzahl nach Filter, „Gespeichert“) als `role="status"` höflich ansagen, nur echte Fehler sofort.

## Fokus
Sichtbarer Fokus (SC 2.4.7) und nicht verdeckt durch Sticky-Header oder Sheets (SC 2.4.11). Dialoge/Sheets: Fokus hinein, eingeschlossen, mit Escape schließbar, danach zurück auf den Auslöser. Kein positives `tabIndex`; kein `aria-hidden` auf fokussierbaren Elementen.

## Wahrnehmung und Bedienung
Kontrast 4,5:1 Text, 3:1 große Schrift und UI-Grenzen (alle Markenfarben gegen ihre Hintergründe messen); Bedeutung nie nur über Farbe (Badges und Status brauchen Text oder Symbol). Zielgröße mindestens 24×24 CSS-Pixel (SC 2.5.8). Reflow bis 320 px ohne Funktionsverlust, Zoom 200 %/400 %. `prefers-reduced-motion` respektieren. Diagramme mit Textalternative bzw. Tabelle.

## Prüfliste je Komponente
Rolle und Name korrekt · Tastatur vollständig · Fokus sichtbar und logisch · Label/Fehler verknüpft · Live-Region für Änderungen · Kontrast gemessen · Zielgröße · Bewegung reduziert. Ergebnis je Punkt PASS / FAIL / NOT RUN.

<!-- Teilweise übernommen und angepasst aus ECC (skills/accessibility, skills/frontend-a11y), MIT-Lizenz, siehe .claude/THIRD_PARTY_NOTICES.md. Korrektur gegenüber der Vorlage: sichtbarer Fokus ist SC 2.4.7, nicht 2.4.11. -->

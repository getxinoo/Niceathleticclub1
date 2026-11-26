# Browser-QA-Ablauf (Ergänzung zu qa-review)
Nur bei Bedarf lesen. Nur gegen lokalen Build oder geschütztes Staging; nie gegen Produktion ohne Freigabe. Nur lesende Abläufe; Schreibende Abläufe (Formulare, Speichern) nur mit Testdaten auf Staging. Keine echten Zugangsdaten in Screenshots oder Berichten; Staging-Zugangsdaten nie protokollieren.

## Phase 1 Smoke
Seite laden; Konsolenfehler (ohne bekanntes Rauschen); keine 4xx/5xx in Netzwerkanfragen; Screenshots Desktop und Mobil; Laborwerte LCP/CLS/INP notieren, klar als Labor gekennzeichnet.

## Phase 2 Interaktion
Alle Navigationslinks; Kernpfade laut Projektprofil; Filter/Sortierung inkl. ungültiger URL-Parameter; Formulare mit gültigen und ungültigen Eingaben (Fehlerzustand sichtbar und angesagt); Null-, Stale- und Fehlerzustände mit Fixtures.

## Phase 3 Darstellung
Screenshots an den Breakpoints laut Projektprofil (Standard 320/390/768/1280/1440 px). Ohne gespeicherte Vergleichsbilder ist das Ergebnis INCONCLUSIVE, nie stillschweigend PASS. Überlauf, fehlende Elemente, Layoutsprünge, lange Texte, Lesbarkeit von Zahlen.

## Phase 4 Barrierefreiheit
axe oder gleichwertig je Seite, danach manuelle Tastatur- und Screenreader-Prüfung (siehe `accessibility/references/web-patterns.md`). Automatisch sauber heißt nicht barrierefrei.

## Bericht
Je Phase PASS / FAIL / NOT RUN / INCONCLUSIVE mit Beleg (Screenshot-Pfad, URL, Commit). Empfehlung: FREIGABEFÄHIG / MIT AUFLAGEN / NICHT FREIGABEFÄHIG. Die Empfehlung ersetzt keine Betreiberfreigabe.

<!-- Teilweise übernommen und angepasst aus ECC (skills/browser-qa), MIT-Lizenz, siehe .claude/THIRD_PARTY_NOTICES.md -->

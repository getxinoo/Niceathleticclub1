---
name: qa-review
description: "Unabhängige QA: prüft Akzeptanzkriterien, Kernpfade, Datenzustände, responsive Darstellung, SEO/A11y-Basis und Sicherheit und gibt eine Release-Empfehlung. Use before a release, staging handover or merge of user-facing changes. Not for reviewing code you wrote yourself."
---
# Independent QA & Release Reviewer
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## qa-review` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Akzeptanzkriterien und Testfälle aus den Projektquellen sammeln; Testmatrix aufstellen.
2. Kernpfade Ende-zu-Ende (laut Projektprofil), inklusive Null-, Stale-, Fehler- und Grenzfälle mit Testdaten.
3. Browser-QA nach `references/browser-qa.md` (Smoke, Interaktion, Darstellung, Barrierefreiheit).
4. Querschnitt: Roh-HTML/SEO-Basis, A11y-Basis, Security-Basis, Fixture-Gate, Mandantenisolation nur mit Testdaten.
5. Ergebnis je Testfall mit Beleg; Repro-Schritte für jedes FAIL.

## Typische Fehler
Selbstfreigabe · „sieht gut aus“ ohne Beleg · fehlende Vergleichsbilder als PASS gewertet · Test gegen Produktion · Release-Empfehlung als Freigabe ausgegeben.

## Ergebnis
QA-Bericht, PASS/FAIL/NOT-RUN-Matrix, Release-Empfehlung, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

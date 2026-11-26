---
name: pre-pr-verification
description: "Eigene Verifikation vor einem Pull Request: Typprüfung, Lint, Tests, Build, projektspezifische Prüfungen, Secret-Suche und Diff-Durchsicht mit ehrlichem PASS/FAIL/NOT-RUN-Bericht. Use after finishing a change and before opening or updating a pull request. Not a replacement for independent review."
---
# Verifikation vor dem Pull Request
Gilt zusammen mit `.claude/XINOO_BASIS.md` und `.claude/project-profile.md`, Abschnitt `## pre-pr-verification` (genaue Befehle, Zusatzprüfungen, Breakpoints). Ersetzt nicht das unabhängige Review (`code-quality-review`, `qa-review`); belegt nur, dass die eigenen Prüfungen gelaufen sind. Build-Ausgaben dürfen entstehen; Quelldateien ändert diese Rolle nicht.

## Phasen (in dieser Reihenfolge; bei FAIL stoppen, beheben lassen, Phase wiederholen)
1. **Typprüfung** (Projektbefehl, z. B. `npm run typecheck`).
2. **Lint** (z. B. `npm run lint`).
3. **Tests** (z. B. `npm test`). Neue Logik braucht neue Tests. Tests nie überspringen, abschwächen oder auskommentieren, um grün zu werden. Nach einem Fehlschlag zuerst nur die fehlgeschlagenen Tests wiederholen.
4. **Build** (Projektbefehl; bei Cache-Verdacht mit Cache-Leerung laut Projektprofil).
5. **Projektspezifische Prüfungen** aus dem Projektprofil (z. B. Roh-HTML, Kontrast, Akzeptanzfälle).
6. **Secret- und Debug-Suche** im Diff: Schlüssel, Tokens, Passwörter, private URLs, `console.log`; öffentliche Build-Variablen enthalten nur öffentliche Werte.
7. **Diff-Durchsicht** gegen die echte PR-Basis (`git diff --stat`): unbeabsichtigte Dateien, Scope-Ausweitung, Kennzeichnung von Testdaten.
8. **Sichtprüfung**, wenn UI geändert: Screenshots an den Breakpoints aus dem Projektprofil, Tastaturbedienung der geänderten Elemente.
Ausgaben vollständig lesen, nicht nur das Ende.

## Zielumgebung getrennt berichten
Lokale oder Cloud-Prüfungen sind kein Nachweis auf dem Zielserver. Zielumgebung nur als PASS melden, wenn die Prüfung dort lief (Umgebung, Commit, Beleg); sonst NOT RUN plus nächster erlaubter Schritt.

## Bericht
```
VERIFIKATION  <Branch> @ <Commit>
Typecheck / Lint / Tests (x/y) / Build / Projektprüfungen: PASS | FAIL | NOT RUN
Secrets: PASS | FAIL | NOT RUN     Diff: n Dateien, Auffälligkeiten
Sichtprüfung: PASS | FAIL | NOT RUN (Breakpoints)
Zielumgebung: PASS | FAIL | NOT RUN (Umgebung, Beleg)
Gesamt: BEREIT | NICHT BEREIT für PR
Offen: …
```

<!-- Teilweise übernommen und angepasst aus ECC (skills/verification-loop), MIT-Lizenz, siehe .claude/THIRD_PARTY_NOTICES.md -->

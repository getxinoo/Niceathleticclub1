---
name: code-quality-review
description: "Code-Review eines Diffs oder Pull Requests auf Korrektheit, Hook-/Zustandsfehler, Sicherheit und Wartbarkeit mit strenger Belegpflicht. Use before merging any pull request or after another role finished a code change. Not for reviewing code you wrote yourself."
---
# Code Quality Reviewer
Gilt zusammen mit `.claude/XINOO_BASIS.md` (insbesondere Abschnitt 8, Belegpflicht) und `.claude/project-profile.md`, Abschnitt `## code-quality-review` (Projektbefehle, Konventionen, zusätzliche P0-Regeln). Fachprüfungen (SEO, A11y, Recht, Fachdaten) gehören zu den jeweiligen Rollen; diese Rolle prüft den Code selbst.

## Umfang festlegen
- PR: echte Basis des PRs verwenden (bei gestapelten PRs den Vorgänger-Branch, nicht pauschal `main`). Lokal: `git diff --staged`, dann `git diff`.
- Betroffene Dateien ganz lesen, Aufrufer und Tests prüfen; nie nur den Diff-Ausschnitt bewerten.
- Vorhandene Projektbefehle ausführen (Typecheck, Lint, Tests laut Projektprofil). Fehlende Werkzeuge als Finding melden, nicht nachinstallieren.
- Nur berichten, nichts umschreiben.

## Häufige Fehlalarme (nur mit konkretem Beleg melden)
Fehlerbehandlung, die eine Ebene höher existiert (Error Boundary, Aufrufer, Middleware) · fehlende Validierung bei internen Funktionen, deren Aufrufer validieren (mindestens einen Aufrufer verfolgen) · „Magic Numbers“ bei offensichtlichen Konstanten (HTTP-Status, 1000 ms, Index 0) · lange, aber einfache `switch`-, Konfigurations- oder Testtabellen · fehlende JSDoc bei selbsterklärenden Helfern · „mögliche Null-Dereferenz“ trotz Type-Guard · bewusst nicht awaitete Aufrufe mit `void` · fest codierte Werte in Fixtures und Tests · Vorschlag eines Stack-Wechsels.

## Prüfliste
**P0 Sicherheit und Daten:** Secrets im Code, Bundle oder Log (öffentliche Build-Variablen wie `EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`, `VITE_*` sind sichtbar) · HTML aus CMS/Feeds/Nutzern ohne Sanitizer gerendert · `href`/`src` aus Daten ohne Schema-Prüfung (`javascript:`, `data:`) · Weiterleitungen mit frei wählbarem Ziel · Testdaten, die produktiv als echt erscheinen können · Mandantengrenze aus dem Client vertraut · zusätzliche P0-Regeln aus dem Projektprofil.
**P1 Zustand und Hooks (React/RN):** bedingte Hook-Aufrufe · fehlende Abhängigkeiten in `useEffect`/`useMemo`/`useCallback` (jedes `eslint-disable` dafür braucht Begründung) · abgeleiteter Zustand per Effect statt beim Rendern berechnet · Effects ohne Aufräumen (Listener, Timer, Requests ohne Abbruch) · veraltete Closures · direkte State-Mutation · `key={index}` in sortier- oder filterbaren Listen · doppelter Zustand · Effect-Ketten.
**P1 Rendering und Daten:** Route-/URL-Parameter ungeprüft verwendet · Browser-APIs beim Server- oder statischen Rendern · fehlende Lade-, Fehler-, Leer- und Stale-Zustände · fehlende Timeouts bei externen Aufrufen · interne Fehlerdetails an Nutzer.
**P2 Wartbarkeit und Leistung:** Funktionen > 50 oder Dateien > 800 Zeilen ohne Grund · Verschachtelung > 4 Ebenen · leere `catch`-Blöcke · `console.log` · toter Code · neue Codepfade ohne Test · neue Objekte/Funktionen als Props an memoisierte Kinder · schwere Berechnung im Render · lange Listen ohne Virtualisierung · Memoisierung ohne messbaren Nutzen · neue Abhängigkeit ohne Begründung.
**P3:** Benennung, TODO ohne Ticket, Formatierung nur bei Verstoß gegen Projektkonvention.

## Ergebnis
Je Finding: `[P0–P3] Titel`, `Datei:Zeile`, Snippet bei P0/P1, Fehlerszenario, Maßnahme. Abschluss: Anzahl je Priorität, Ergebnis der Projektbefehle (PASS / FAIL / NOT RUN) und Empfehlung FREIGABEFÄHIG (kein P0/P1) / MIT AUFLAGEN (P1 mit Plan) / NICHT FREIGABEFÄHIG (P0). Eine saubere Prüfung mit null Findings ist ausdrücklich erwünscht, wenn der Code sauber ist.

<!-- Teilweise übernommen und angepasst aus ECC (agents/code-reviewer.md, agents/react-reviewer.md), MIT-Lizenz, siehe .claude/THIRD_PARTY_NOTICES.md -->

---
name: frontend-engineering
description: "Frontend-Engineering: implementiert und verantwortet die Frontend-Architektur (Routing, Zustand, Datenadapter, Rendering, Fehlerzustände) im vom Projekt festgelegten Stack. Use when writing or restructuring frontend code. Not for reviewing your own code (use code-quality-review by another role)."
---
# Principal Frontend Engineer
Gilt zusammen mit `.claude/XINOO_BASIS.md` (Rangfolge, Belegpflicht, Ergebnisformat) und `.claude/project-profile.md`. Lies dort zuerst den Abschnitt `## frontend-engineering` (Quellen, projektspezifische Vorgaben). Projektvorgaben gehen dieser Datei vor.

## Vorgehen
1. Tatsächlichen Stack, Versionen und Projektbefehle aus Repo und Projektprofil ermitteln; kein stiller Stack- oder Framework-Wechsel (sonst ADR plus Freigabe).
2. Rendering-Strategie belegen (z. B. SSR/SSG: Roh-HTML ohne JS enthält Titel, Inhalte, Links, Statuscode, Canonical).
3. Architektur: dünne Routen, typisierte Adapter, getrennter Zustand, Fehlergrenzen, Request-Abbruch. Details in `references/implementation-patterns.md`.
4. Fixtures klar getrennt von Live-Daten und sichtbar gekennzeichnet; nie produktiv als echt ausspielen.
5. Vor dem PR `pre-pr-verification`; Review durch eine andere Rolle.

## Typische Fehler
SPA als Default ohne SEO-Nachweis · ungeprüfte Route-Parameter · Secrets im Bundle · fehlende Lade-/Fehler-/Leer-Zustände · neue Bibliothek ohne Begründung · Browser-API beim statischen Rendern.

## Ergebnis
ADR bei Architekturfragen, vertikaler Slice, Build-/Lint-/Typecheck-/Testnachweise, im Ergebnisformat aus `XINOO_BASIS.md` Abschnitt 7. Bei fehlendem Zugriff oder Werkzeug: als Blocker dokumentieren, nicht vortäuschen.

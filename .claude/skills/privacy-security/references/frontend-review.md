# Frontend-Sicherheitsprüfung (Ergänzung zu privacy-security)
Nur bei Bedarf lesen. Nur autorisierte Testressourcen, keine Penetration fremder Dienste. Vorhandene Projektwerkzeuge nutzen (`npm audit` ohne automatisches Fix); keine zusätzlichen Scanner per `npx` herunterladen.

## Sofort melden (P0)
| Muster | Maßnahme |
|---|---|
| Secret, Token, Passwort im Code, Bundle, Log oder Commit | entfernen, Rotation empfehlen, Betreiber informieren |
| Öffentliche Build-Variable (`EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`, `VITE_*`) mit nicht öffentlichem Wert | serverseitig halten oder streichen |
| HTML aus CMS/Feeds ungefiltert gerendert | Text rendern oder Allowlist-Sanitizer |
| `href`/`src` aus Daten ohne Schema-Prüfung | nur `https:` und erlaubte Hosts |
| Weiterleitung/Clickout mit frei wählbarem Ziel (Open Redirect) | Ziel-Allowlist |
| Fixture- oder Fremdmandanten-Daten im öffentlichen Build | Build-Gate, Mandantengrenze prüfen |

## Prüfen (P1/P2)
Externe Links `rel="noopener noreferrer"` (+ `sponsored` bei bezahlten oder Affiliate-Links); Sicherheitsheader-Vorschlag (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors) nur als Vorschlag, nginx-Änderungen sind freigabepflichtig; keine personenbezogenen Daten in URL-Parametern, Logs oder Analytics; `localStorage` nur für unkritische Einstellungen, nie für Tokens; Fehlermeldungen ohne interne Details; Abhängigkeiten mit bekannten Schwachstellen; Consent vor jeder nicht notwendigen Speicherung (TDDDG).

## Häufige Fehlalarme
Platzhalter in `.env.example`; klar gekennzeichnete Testwerte in Tests; bewusst öffentliche Schlüssel; Hashes für Prüfsummen statt Passwörter. Kontext immer prüfen.

## Bei kritischem Fund
Belegen, Betreiber sofort informieren, sichere Alternative nennen, Behebung nachprüfen, Rotation exponierter Zugangsdaten empfehlen. Keine eigenmächtigen Änderungen an Server, DNS oder Zugangsdaten.

<!-- Teilweise übernommen und angepasst aus ECC (agents/security-reviewer.md), MIT-Lizenz, siehe .claude/THIRD_PARTY_NOTICES.md -->

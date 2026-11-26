# Implementierungsmuster (Ergänzung zu frontend-engineering)
Nur bei Bedarf lesen. Projektprofil, Architektur-ADRs und bestehende Projektmuster haben Vorrang. Beispiele beziehen sich auf React / React Native (Web); für andere Stacks sinngemäß anwenden. Keine neuen Bibliotheken (z. B. TanStack Query, Zod, NativeWind, Zustand) ohne ADR und Freigabe; die Muster gelten unabhängig vom Paket.

## Routen
- Routendateien (z. B. `app/` bei Expo Router) dünn halten: Parameter lesen und prüfen, dann an eine Screen-Komponente übergeben.
- Routen-Parameter und Deep-Links sind unvertrauenswürdige Strings: Format prüfen (Slug, ID, erlaubte Werte), bei Fehler auf Not-Found statt Absturz oder leerer Seite. Ungültige Filter-/Sortierwerte auf Standard zurückfallen lassen.

## Zustand trennen
| Art | Ort |
|---|---|
| Serverdaten (fachliche Daten aus API/CMS) | Adapter/Datenschicht, nicht in globale Stores kopieren |
| UI-Zustand | lokaler `useState`, erst bei echtem Teilen Context |
| Such-, Filter-, Sortierzustand | URL/Route-Parameter (teilbar, crawlbar gemäß SEO-Policy) |
| Formulare | lokaler Zustand plus Validierung an der Grenze |
| Secrets | nie im Client |
Lokalen Zustand bevorzugen, bis Teilen wirklich nötig ist. Keine doppelte Wahrheit.

## Daten an der Grenze prüfen
Antworten aus Adaptern und Fixtures an der Grenze auf Typ und Pflichtfelder prüfen; Typen aus einer Quelle ableiten. Unbekannt bleibt unbekannt (nicht 0, kein Platzhalterpreis). Jeder Datenbildschirm hat Lade-, Fehler-, Leer- und Stale-Zustand; nie nur einen Spinner ohne Ausweg.

## Listen und Rendering
- Lange Listen virtualisieren (`FlatList`/Äquivalent) statt großer Arrays in `ScrollView`; `renderItem` stabil, `keyExtractor` mit stabiler ID.
- Stile mit `StyleSheet.create` auf Modulebene bzw. über Tokens aus der Token-Datei laut Projektprofil; keine Inline-Stilobjekte auf heißen Pfaden.
- Effekte und Abos in `use*`-Hooks kapseln und immer aufräumen; veraltete Ergebnisse nach Unmount oder neuem Request verwerfen (Abbruch).

## Anti-Muster
Große Liste in `ScrollView`; Serverdaten in globalen Store kopiert; ungeprüfte Route-Parameter; echtes Secret im Bundle; Inline-Stile im Hot Path; Browser-API beim Server- oder statischen Rendern ausgeführt.

<!-- Teilweise übernommen und angepasst aus ECC (skills/react-native-patterns), MIT-Lizenz, siehe .claude/THIRD_PARTY_NOTICES.md -->

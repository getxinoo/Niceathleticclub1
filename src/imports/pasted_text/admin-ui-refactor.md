Verzeihung, das habe ich verstanden! Wenn du den Code über ein Tool wie "Figma Make", Cursor, Lovable oder v0.dev generierst und bereits diese massive Codebase (mit AdminSettings.tsx, AdminFinances.tsx, den fertigen Frontend-Seiten und den bestehenden APIs) hast, müssen wir komplett anders ansetzen.

Wir dürfen nichts von Grund auf neu erfinden, sondern müssen der KI exakt sagen, welche bestehenden Dateien sie öffnen, refactoren (umbauen) und erweitern soll, um die Menüs zusammenzufassen, die Settings dynamisch zu machen und die neuen Features (PDF/HR) in dein bestehendes System einzupflanzen. Das Frontend (Bilder/Layout) lassen wir unangetastet, wir tauschen nur hartcodierten Text gegen die API-Variablen aus.

Hier sind die 5 aufeinander aufbauenden Master-Prompts. Du kannst sie nacheinander in dein KI-Tool kopieren. Die KI wird anhand deiner Git-Struktur genau wissen, welche Dateien gemeint sind.

🟢 PROMPT 1: Admin-Navigation aufräumen & konsolidieren
Dieser Prompt nimmt sich deine vielen bestehenden Admin-Seiten vor und fasst sie in einem sauberen, App-ähnlichen Layout zusammen.

Kontext: Wir haben eine bestehende React-Codebase (Tailwind, shadcn/ui). Aktuell gibt es zu viele einzelne Admin-Seiten (AdminTeam, AdminTarife, AdminMembers, AdminKurse, etc.), was die Sidebar unübersichtlich macht.

Aufgabe: Öffne die Datei src/app/admin/components/AdminLayout.tsx und passe die Navigation an. Fasse die bestehenden Routen in logische, einklappbare Gruppen (Akkordeons oder Dropdowns) zusammen:

👥 Personen & CRM: Fasse hier die Links zu AdminMembers.tsx, AdminLeads.tsx und AdminTeam.tsx zusammen.

🏋️ Studio Operations: Fasse hier AdminKurse.tsx, AdminBuchungen.tsx, AdminCoaching.tsx und AdminDiagnostics.tsx zusammen.

💼 HR & Personal: Fasse hier AdminEinsatzplan.tsx, AdminAbwesenheiten.tsx, AdminAntraege.tsx und AdminBewerber.tsx zusammen.

💰 Finanzen: Verlinke auf AdminFinances.tsx (Rechnungen, Inkasso, SEPA).

⚙️ System & CMS: Fasse hier AdminSettings.tsx, AdminSeiten.tsx (Page Editor), AdminReviews.tsx, AdminPresse.tsx und AdminAudit.tsx zusammen.

Anforderung: Nutze für die Sidebar moderne Icons aus lucide-react. Das Design der Sidebar soll wie eine moderne SaaS-App wirken (Dark Mode). Das eigentliche Routing in routes.ts bleibt bestehen, wir optimieren nur das visuelle Layout der AdminLayout.tsx Sidebar.

🟢 PROMPT 2: Settings-API (Single Source of Truth) an das Frontend anbinden
Dieser Prompt sorgt dafür, dass die Einstellungen (Impressum, Bankdaten) aus AdminSettings im Frontend angezeigt werden, ohne das Design des Frontends zu zerstören.

Kontext: Wir haben bereits einen SettingsContext.tsx und die Dateien api/public/settings.php sowie api/admin/settings.php. Wir müssen nun globale Firmendaten dynamisch machen. Das visuelle Design der Frontend-Seiten darf NICHT verändert werden.

Aufgabe 1 (Admin UI erweitern): Öffne src/app/admin/pages/AdminSettings.tsx. Erweitere das bestehende Formular um folgende Felder (falls nicht vorhanden): "Firmenname", "Straße", "PLZ & Ort", "E-Mail (öffentlich)", "Telefon", "USt-IdNr.", "Registergericht", "HRB-Nummer", "Geschäftsführer" sowie die Bankdaten "Bankname", "IBAN", "BIC". Füge zudem zwei Felder für Nummernkreise hinzu: "Rechnungs-Präfix (z.B. RE-)" und "Mitglieds-Präfix".

Aufgabe 2 (Frontend anbinden): Öffne src/app/pages/Impressum.tsx, src/app/pages/Kontakt.tsx und src/app/components/layout/Footer.tsx.
Importiere den useSettings() Hook aus src/app/context/SettingsContext.tsx.
Ersetze alle aktuell hartcodierten Texte (wie Adresse, Telefonnummer, E-Mail und Impressums-Daten) durch die dynamischen Variablen aus dem settings Objekt (z.B. {settings?.company_name}). Behalte alle bestehenden Tailwind-Klassen und HTML-Tags exakt bei, tausche nur den Text in den Tags aus.

🟢 PROMPT 3: Finanzen, Inkasso & Rechnungs-PDF (Angebot-Design)
Dieser Prompt baut das PDF-Template und erweitert dein bestehendes Finanz-Dashboard.

Kontext: Wir haben die Seiten AdminFinances.tsx und die Komponente InkassoPanel.tsx. Wir müssen eine Funktion zum Generieren von professionellen Rechnungs-PDFs hinzufügen.

Aufgabe 1 (Das PDF-HTML-Template): Erstelle eine neue Datei src/api/php/invoice_template.html. Generiere reines, klassisches HTML (KEIN Flexbox, KEIN CSS Grid, nur Inline-CSS, <style> und <table>). Das Layout muss aussehen wie ein professionelles Angebot/Rechnung:

Oben links: Platzhalter <img src="{{company_logo_url}}">.

Darunter: Empfängeradresse {{member_name}}, {{member_street}}.

Oben rechts: Block mit Rechnungsnr.: {{invoice_number}}, Datum: {{date}}.

Mitte: Eine klassische <table> mit den Spalten Pos, Bezeichnung, Menge, Preis, Gesamt. (Inhalt: {{positions_html}}).

Unten rechts: Summen (Netto, 19% USt, Brutto).

Footer (absolut unten): 3 Spalten (mit float) für 1. Firmenadresse, 2. Kontakt, 3. Bankverbindung ({{bank_iban}}).

Aufgabe 2 (AdminFinances UI): Öffne src/app/admin/pages/AdminFinances.tsx. Füge in der Tabelle für Rechnungen/Mahnungen bei jeder Zeile einen neuen Button "PDF Rechnung generieren" hinzu. Füge im InkassoPanel.tsx zudem einen Switch-Toggle "Mitglied blockieren (QR Zutritt sperren)" hinzu, der aufleuchtet, wenn das Mitglied in Mahnstufe 2 ist.

🟢 PROMPT 4: Das HR-System & Bewerber-Kanban perfektionieren
Nutzt deine bestehenden Dateien für Schichtpläne und Bewerber und macht sie hochfunktional.

Kontext: Wir haben die Dateien AdminEinsatzplan.tsx, AdminBewerber.tsx und UnifiedStaffEditor.tsx.

Aufgabe 1 (Einsatzplan): Überarbeite AdminEinsatzplan.tsx. Baue eine visuelle Wochen-Grid-Ansicht (Kalender). Y-Achse: Liste der Mitarbeiter (aus der Team-DB). X-Achse: Wochentage (Mo-So). Implementiere Drag-and-Drop, um Schicht-Blöcke (z.B. "Theke", "CrossFit Class") auf Mitarbeiter und Tage zu ziehen. Füge einen globalen Button "Wochenplan per E-Mail an Team senden" hinzu.

Aufgabe 2 (Bewerber Kanban): Überarbeite AdminBewerber.tsx. Anstatt einer simplen Tabelle, wandle das UI in ein Kanban-Board um mit den Spalten "Neu", "In Prüfung", "Interview", "Abgesagt". Die Daten kommen von der API (aus E-Mail-Bewerbungen). Jede Karte zeigt den Namen und einen Button "Lebenslauf PDF ansehen".

Aufgabe 3 (Mitarbeiter-Nummer): Öffne UnifiedStaffEditor.tsx. Füge in der Ansicht ein Read-Only-Feld "Mitarbeiter-Nr. (z.B. EMP-045)" hinzu, das deutlich sichtbar neben dem Namen des Mitarbeiters steht.

🟢 PROMPT 5: Member Portal Feature-Sperre (Upselling) & Neues Magazin
Verknüpft die Tarife mit dem Member-UI und fügt den Blog ins bestehende System ein.

Kontext: Wir haben das Frontend der App (MemberDashboard.tsx, MemberCoaching.tsx) und bestehende Tarife (use-pricing.ts).

Aufgabe 1 (Tarif-Gating): Öffne src/app/member/pages/MemberDashboard.tsx. Finde die Kachel/den Button für "Coaching & Pläne" (MemberCoaching). Implementiere eine Logik: Wenn das Mitglied nicht den "NICEST" oder "Athletic" Tarif hat, wird die Kachel visuell ausgegraut und erhält ein 🔒 Icon. Klickt der Nutzer darauf, leite ihn nicht zur Seite weiter, sondern öffne ein Bottom-Sheet (Modal) mit einem starken Upsell-Text: "Dieses Feature ist nur im Premium-Tarif verfügbar. Hol dir individuelle Trainingspläne." und einem Call-to-Action "Jetzt upgraden".

Aufgabe 2 (Das neue Blog CMS UI): Erstelle in src/app/admin/pages/ eine neue Datei AdminMagazin.tsx. Erstelle hier ein WYSIWYG-Editor-Layout zum Schreiben von Blogbeiträgen. Oben ein Upload für das Coverbild, ein Input für den Titel und ein Dropdown für die Kategorie. Darunter ein großer Texteditor. Füge diese neue Seite in die AdminLayout.tsx Sidebar unter "System & CMS" ein.
-- 2026-07-11_addon_row_model.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE Migration für das erweiterte Add-on-Modell (Icon je Karte,
-- Freitext-Zeilen leftText/rightText, optionale Zeilenbeschreibung,
-- Sichtbarkeit je Zeile).
--
-- NICHT automatisch ausgeführt. Manuell gegen die Produktions-DB anwenden,
-- NACHDEM das zugehörige Frontend/Backend deployt ist. api/pricing.php und
-- api/public/pricing.php erkennen die Spalten zur Laufzeit (SHOW COLUMNS)
-- und degradieren ohne Migration sanft auf das bisherige Verhalten –
-- die Migration ist also gefahrlos nachziehbar.
--
-- Rückwärtskompatibilität: `label` bleibt die linke Spalte (leftText),
-- `price` bleibt als numerischer Wert für Beispielrechnung/Sortierung
-- erhalten; `right_text` überschreibt nur die ANZEIGE der rechten Spalte
-- (NULL → weiterhin "+{price}€").

ALTER TABLE pricing_addons
    ADD COLUMN icon VARCHAR(40) NULL DEFAULT NULL AFTER description;

ALTER TABLE pricing_addon_options
    ADD COLUMN right_text  VARCHAR(120) NULL DEFAULT NULL AFTER price,
    ADD COLUMN description VARCHAR(255) NULL DEFAULT NULL AFTER right_text,
    ADD COLUMN visible     TINYINT(1)   NOT NULL DEFAULT 1 AFTER description;

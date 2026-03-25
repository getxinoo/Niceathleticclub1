/**
 * SettingsContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Lädt öffentliche Studio-/Firmendaten einmalig beim App-Start aus
 * api/public/settings.php und stellt sie per Context für alle Komponenten
 * bereit. Bietet zusätzlich eine `refresh()`-Funktion, die den Cache neu
 * lädt – z.B. nachdem AdminSettings Änderungen gespeichert hat.
 *
 * Verwendung:
 *   const { s, refresh } = useSettings();
 *   s.company_name   // "MK Fitness & Strength GmbH"
 *   s.phone          // "+49 (0) 7161 / 9163663"
 *   await refresh(); // Daten neu vom Server holen
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../../lib/api-service";

// ── Defaults (Fallback wenn API nicht erreichbar) ──────────────────────────────
export const SETTINGS_DEFAULTS: Record<string, string> = {
  studio_name:    "Nice Athletic Club Göppingen",
  company_name:   "MK Fitness & Strength GmbH",
  company_street: "Robert-Bosch-Str. 5",
  company_zip:    "73037",
  company_city:   "Göppingen",
  company_court:  "Amtsgericht Ulm",
  company_hrb:    "HRB 737370",
  ceo:            "Wilhelm Walter",
  phone:          "+49 (0) 7161 / 9163663",
  email:          "info@nice-fitness.de",
  website:        "https://www.nice-fitness.de",
  vat_id:         "DE123456789",
  bank_iban:      "DE89 3704 0044 0532 0130 00",
  bank_bic:       "COBADEFFXXX",
  bank_name:      "Commerzbank AG",
  logo_url:       "",
};

// ── Context-Typ ────────────────────────────────────────────────────────────────
interface SettingsContextValue {
  /** Key/Value-Map der öffentlichen Settings – immer mit Defaults befüllt */
  s: Record<string, string>;
  /** true während des ersten Ladevorgangs */
  loading: boolean;
  /**
   * Lädt die Settings neu vom Server (bust PHP-Cache + React-State).
   * Nützlich nach AdminSettings.save(), damit Footer & Co. sofort aktuell sind.
   */
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  s: SETTINGS_DEFAULTS,
  loading: true,
  refresh: async () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Record<string, string>>(SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.public.settings();
      setS({ ...SETTINGS_DEFAULTS, ...(data as Record<string, string>) });
    } catch {
      /* Defaults bleiben aktiv */
    }
  }, []);

  // Initialer Ladevorgang
  useEffect(() => {
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  // refresh() für externe Aufrufer (z.B. AdminSettings nach Save)
  const refresh = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ s, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useSettings() {
  return useContext(SettingsContext);
}

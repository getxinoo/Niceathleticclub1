/**
 * KarriereCountContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tiny reactive store for the "new applicant" count that powers the sidebar
 * badge on the "Karriere" nav item.
 *
 * AdminKarriereHub writes to it after every data load.
 * AdminLayout Sidebar reads from it to display the badge.
 * Persisted in sessionStorage so badge survives tab-switches.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

const SESSION_KEY = "nac_karriere_new_count";

function readSession(): number {
  try { return Number(sessionStorage.getItem(SESSION_KEY) ?? "0") || 0; }
  catch { return 0; }
}
function writeSession(n: number) {
  try { sessionStorage.setItem(SESSION_KEY, String(n)); } catch { /* ignore */ }
}

interface KarriereCountCtx {
  newCount: number;
  setNewCount: (n: number) => void;
}

const KarriereCountContext = createContext<KarriereCountCtx | null>(null);

export function KarriereCountProvider({ children }: { children: ReactNode }) {
  const [newCount, setNewCountState] = useState<number>(readSession);

  const setNewCount = useCallback((n: number) => {
    setNewCountState(n);
    writeSession(n);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && e.newValue !== null)
        setNewCountState(Number(e.newValue) || 0);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <KarriereCountContext.Provider value={{ newCount, setNewCount }}>
      {children}
    </KarriereCountContext.Provider>
  );
}

export function useKarriereCount() {
  const ctx = useContext(KarriereCountContext);
  if (!ctx) throw new Error("useKarriereCount must be inside <KarriereCountProvider>");
  return ctx;
}

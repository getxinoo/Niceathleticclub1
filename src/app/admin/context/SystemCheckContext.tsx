/**
 * SystemCheckContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight shared store for System-Check results.
 * AdminDiagnostics writes into it when a run finishes.
 * AdminLayout sidebar reads from it to show a status badge.
 * Persisted to sessionStorage so the badge survives tab-switches.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ── State ─────────────────────────────────────────────────────────────────────

export interface SystemCheckResult {
  ok:          number;
  errors:      number;
  auth:        number;   // auth-missing (yellow)
  total:       number;
  status:      "idle" | "running" | "done";
  lastChecked: string | null; // ISO string
}

const DEFAULT_STATE: SystemCheckResult = {
  ok:          0,
  errors:      0,
  auth:        0,
  total:       0,
  status:      "idle",
  lastChecked: null,
};

const SESSION_KEY = "nac_syscheck_result";

function readSession(): SystemCheckResult {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeSession(s: SystemCheckResult) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface SystemCheckContextType {
  result: SystemCheckResult;
  setRunning:   ()                                                          => void;
  setCompleted: (counts: Pick<SystemCheckResult, "ok" | "errors" | "auth" | "total">) => void;
  reset:        ()                                                          => void;
}

const SystemCheckContext = createContext<SystemCheckContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SystemCheckProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<SystemCheckResult>(readSession);

  const setRunning = useCallback(() => {
    const next: SystemCheckResult = { ...DEFAULT_STATE, status: "running" };
    setResult(next);
    writeSession(next);
  }, []);

  const setCompleted = useCallback(
    (counts: Pick<SystemCheckResult, "ok" | "errors" | "auth" | "total">) => {
      const next: SystemCheckResult = {
        ...counts,
        status:      "done",
        lastChecked: new Date().toISOString(),
      };
      setResult(next);
      writeSession(next);
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(DEFAULT_STATE);
    writeSession(DEFAULT_STATE);
  }, []);

  // Keep sessionStorage in sync when another tab updates it
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && e.newValue) {
        try { setResult({ ...DEFAULT_STATE, ...JSON.parse(e.newValue) }); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <SystemCheckContext.Provider value={{ result, setRunning, setCompleted, reset }}>
      {children}
    </SystemCheckContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSystemCheck() {
  const ctx = useContext(SystemCheckContext);
  if (!ctx) throw new Error("useSystemCheck must be used inside <SystemCheckProvider>");
  return ctx;
}

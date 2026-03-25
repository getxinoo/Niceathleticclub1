/**
 * api/press.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Modul fuer Presseberichte / Medienerwaehnungen.
 * Versucht zuerst das PHP-Backend, faellt auf die Mock-DB zurueck.
 */

import { mockDb } from "../data/mock-db";
import type { PressArticle, MediaType } from "../data/press";

// Re-export types for convenience
export type { PressArticle, MediaType };

const BASE = "https://nicefitness.de/api";
const TOKEN_KEY = "nac_auth_token";
const getToken = (): string | null => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | null> {
  const token = getToken();
  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const pressApi = {
  /** Alle Presseberichte laden (sortiert nach Datum absteigend) */
  list: async (): Promise<PressArticle[]> => {
    const data = await apiFetch<PressArticle[]>("/press.php");
    if (data) return data;
    // Fallback: Mock-DB
    return mockDb.getPress();
  },

  /** Einzelnen Pressebericht laden */
  get: async (id: string): Promise<PressArticle | null> => {
    const data = await apiFetch<PressArticle>(`/press.php?id=${encodeURIComponent(id)}`);
    if (data) return data;
    return mockDb.getPressArticle(id) ?? null;
  },

  /** Neuen Pressebericht anlegen */
  create: async (article: Omit<PressArticle, "id">): Promise<PressArticle> => {
    const data = await apiFetch<PressArticle>("/press.php", {
      method: "POST",
      body: JSON.stringify(article),
    });
    if (data) return data;
    // Fallback: Mock-DB
    const newArticle: PressArticle = {
      ...article,
      id: `press-${Date.now()}`,
    };
    return mockDb.addPressArticle(newArticle);
  },

  /** Pressebericht aktualisieren */
  update: async (id: string, data: Partial<PressArticle>): Promise<PressArticle | null> => {
    const res = await apiFetch<PressArticle>(`/press.php?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res) return res;
    return mockDb.updatePressArticle(id, data);
  },

  /** Pressebericht loeschen */
  delete: async (id: string): Promise<boolean> => {
    const res = await apiFetch<{ success: boolean }>(`/press.php?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res?.success) return true;
    return mockDb.removePressArticle(id);
  },
};
/**
 * PageVisibilityContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Verwaltet welche Seiten sichtbar (published) sind und welche Nav-Overrides
 * existieren.
 *
 * WICHTIG – Single Source of Truth:
 * - Sichtbarkeit kommt AUSSCHLIESSLICH aus `pages.status` (api.pages.list()).
 *   status === "published" → sichtbar, status === "draft" → ausgeblendet.
 *   Es gibt keine separate "page_visibility.visible"-Wahrheit mehr.
 * - Nav-Overrides (customHref/customLabel) sind eine eigenständige, nicht
 *   sicherheitsrelevante Funktion und bleiben über api.pageVisibility.
 * - setVisible(slug, visible) schreibt direkt pages.status (published/draft).
 *
 * Logik:
 * - Jede Seite hat einen `visible`-Boolean, abgeleitet aus ihrem CMS-Status
 * - Jede Nav-Item kann ein Override haben: { slug, customHref, customLabel }
 *   → Wenn eine Seite ausgeblendet ist aber ein Override existiert, bleibt
 *     der Nav-Punkt sichtbar und zeigt auf die Override-URL
 * - Ohne Override verschwindet der Nav-Punkt wenn die Seite hidden ist
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../../lib/api-service";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface NavOverride {
  /** Original nav href (e.g. "/studio") */
  navHref: string;
  /** Override href – where the nav point should link instead */
  customHref: string;
  /** Optional custom label */
  customLabel?: string;
}

export interface PageVisibilityState {
  /** slug → visible */
  visibility: Record<string, boolean>;
  /** navHref → NavOverride */
  navOverrides: Record<string, NavOverride>;
}

interface PageVisibilityContextValue {
  /** Check if a page slug is visible */
  isVisible: (slug: string) => boolean;
  /** Toggle visibility for a slug */
  setVisible: (slug: string, visible: boolean) => void;
  /** Get all visibility state */
  visibility: Record<string, boolean>;
  /** Nav overrides */
  navOverrides: Record<string, NavOverride>;
  /** Set a nav override */
  setNavOverride: (navHref: string, override: NavOverride | null) => void;
  /** Get filtered nav items for public display */
  getVisibleNavItems: (
    items: { label: string; href: string }[]
  ) => { label: string; href: string }[];
  /** Get filtered link items for footer / any link list */
  getVisibleLinks: (
    links: { label: string; to: string | null }[]
  ) => { label: string; to: string | null }[];
  /** Whether initial API load is done */
  loaded: boolean;
}

const STORAGE_KEY = "nac_page_visibility";

const defaultState: PageVisibilityState = {
  visibility: {},
  navOverrides: {},
};

function loadStateLocal(): PageVisibilityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {}
  return defaultState;
}

function saveStateLocal(state: PageVisibilityState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ── Mapping: welche Slugs gehören zu welchen Nav-Hrefs ─────────────────────
const SLUG_TO_NAV_HREF: Record<string, string> = {
  studio: "/studio",
  kurse: "/kurse",
  preise: "/preise",
  team: "/team",
  kontakt: "/kontakt",
};

const NAV_HREF_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_NAV_HREF).map(([k, v]) => [v, k])
);

// ── Mapping: path → slug for footer link filtering ────────────────────────
const PATH_TO_SLUG: Record<string, string> = {
  "/studio": "studio",
  "/kurse": "kurse",
  "/preise": "preise",
  "/team": "team",
  "/kontakt": "kontakt",
  "/probetraining": "probetraining",
  "/ueber-uns": "ueber-uns",
  "/personal-training": "personal-training",
  "/crossfit-gp": "crossfit-gp",
  "/firmenfitness": "firmenfitness",
  "/athletic-area": "athletic-area",
  "/hyrox": "hyrox",
  "/nice-theke": "nice-theke",
  "/karriere": "karriere",
  "/presse": "presse",
};

// ── Context ────────────────────────────────────────────────────────────────────

const PageVisibilityContext = createContext<PageVisibilityContextValue>({
  isVisible: () => true,
  setVisible: () => {},
  visibility: {},
  navOverrides: {},
  setNavOverride: () => {},
  getVisibleNavItems: (items) => items,
  getVisibleLinks: (links) => links,
  loaded: false,
});

export function PageVisibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageVisibilityState>(loadStateLocal);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  // ── Load from API on mount ──────────────────────────────────────────────
  // Sichtbarkeit: pages.status ist die einzige Wahrheit (api.pages.list()).
  // Nav-Overrides: separate, nicht sicherheitsrelevante Funktion (best effort).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let nextVisibility: Record<string, boolean> | null = null;
      try {
        // strictRequest intern – ein echter Fehler darf NIE zu "alles sichtbar" führen.
        const pages = await api.pages.list();
        nextVisibility = {};
        for (const p of pages) {
          nextVisibility[p.slug] = p.status === "published";
        }
      } catch {
        // Pages-Liste nicht ladbar → bestehenden (localStorage-)Stand behalten,
        // NIEMALS stillschweigend auf "alles sichtbar" zurückfallen.
      }

      let nextNavOverrides: Record<string, NavOverride> | null = null;
      try {
        let remote: Awaited<ReturnType<typeof api.pageVisibility.get>> | null = null;
        try {
          remote = await api.pageVisibility.get();
        } catch {
          remote = await api.pageVisibility.getPublic();
        }
        if (remote) {
          nextNavOverrides = (remote.navOverrides ?? {}) as Record<string, NavOverride>;
        }
      } catch {
        // Nav-Overrides nicht ladbar → bestehenden Stand behalten (unkritisch)
      }

      if (!cancelled) {
        setState((prev) => {
          const merged: PageVisibilityState = {
            visibility: nextVisibility ?? prev.visibility,
            navOverrides: nextNavOverrides ?? prev.navOverrides,
          };
          saveStateLocal(merged);
          return merged;
        });
      }
      if (!cancelled) {
        initialLoadDone.current = true;
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Persist to localStorage on every change ──────────────────────────────
  useEffect(() => {
    if (!initialLoadDone.current) return;
    saveStateLocal(state);
  }, [state]);

  // ── Debounced save of Nav-Overrides only (Sichtbarkeit wird direkt in
  //    setVisible() gegen pages.status geschrieben, nicht hier) ─────────────
  useEffect(() => {
    if (!initialLoadDone.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.pageVisibility.save({
        navOverrides: state.navOverrides,
      }).catch(() => {
        // Silent fail – localStorage ist bereits aktualisiert
      });
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.navOverrides]);

  const isVisible = useCallback(
    (slug: string) => state.visibility[slug] !== false,
    [state.visibility]
  );

  const setVisible = useCallback((slug: string, visible: boolean) => {
    setState((prev) => ({
      ...prev,
      visibility: { ...prev.visibility, [slug]: visible },
    }));
    // pages.status ist die einzige Wahrheit – sofort (nicht debounced) schreiben.
    api.pages.updateMeta(slug, { status: visible ? "published" : "draft" }).catch(() => {
      // Best-effort; optimistischer lokaler State bleibt bestehen (Retry beim naechsten Load)
    });
  }, []);

  const setNavOverride = useCallback(
    (navHref: string, override: NavOverride | null) => {
      setState((prev) => {
        const next = { ...prev.navOverrides };
        if (override) {
          next[navHref] = override;
        } else {
          delete next[navHref];
        }
        return { ...prev, navOverrides: next };
      });
    },
    []
  );

  const getVisibleNavItems = useCallback(
    (items: { label: string; href: string }[]) => {
      return items
        .map((item) => {
          const slug = NAV_HREF_TO_SLUG[item.href];
          const hidden = slug && state.visibility[slug] === false;
          const override = state.navOverrides[item.href];

          if (hidden) {
            // Page is hidden – check for override
            if (override && override.customHref) {
              return {
                label: override.customLabel || item.label,
                href: override.customHref,
              };
            }
            // No override → hide nav item
            return null;
          }

          // Page is visible – still apply override if set
          if (override && override.customHref) {
            return {
              label: override.customLabel || item.label,
              href: override.customHref,
            };
          }

          return item;
        })
        .filter(Boolean) as { label: string; href: string }[];
    },
    [state.visibility, state.navOverrides]
  );

  /** Filter footer / generic link lists by visibility */
  const getVisibleLinks = useCallback(
    (links: { label: string; to: string | null }[]) => {
      return links.filter((link) => {
        if (!link.to) return true; // Non-link entries always shown
        const slug = PATH_TO_SLUG[link.to];
        if (!slug) return true; // No mapping → always visible (legal pages etc.)
        return state.visibility[slug] !== false;
      });
    },
    [state.visibility]
  );

  return (
    <PageVisibilityContext.Provider
      value={{
        isVisible,
        setVisible,
        visibility: state.visibility,
        navOverrides: state.navOverrides,
        setNavOverride,
        getVisibleNavItems,
        getVisibleLinks,
        loaded,
      }}
    >
      {children}
    </PageVisibilityContext.Provider>
  );
}

export function usePageVisibility() {
  return useContext(PageVisibilityContext);
}

export { NAV_HREF_TO_SLUG, SLUG_TO_NAV_HREF };

/**
 * links.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared link model for CMS-editable boxes/cards/buttons/images.
 *
 * Three states only:
 *  • internal → React Router path, must start with "/"
 *  • external → absolute URL, must start with "http://" or "https://"
 *  • none     → not clickable (NOT an href="#", NOT a broken handler)
 *
 * This module is additive/new: nothing in the app currently imports it, so it
 * does not change any existing behavior. It defines the vocabulary that future
 * card/button editors and renderers (see SmartLink.tsx) will consume.
 */

export type PageLink =
  | { kind: "internal"; path: string }
  | { kind: "external"; url: string; newTab?: boolean }
  | { kind: "none" };

export interface LinkValidationResult {
  valid: boolean;
  error?: string;
}

const DANGEROUS_SCHEME = /^\s*[a-z][a-z0-9+.-]*:/i;
const ALLOWED_EXTERNAL_SCHEMES = /^https?:\/\//i;

/**
 * Validates a PageLink against the fixed rule set. Pure function, no I/O.
 */
export function validateLink(link: PageLink | null | undefined): LinkValidationResult {
  if (!link || link.kind === "none") {
    return { valid: true };
  }

  if (link.kind === "internal") {
    const path = link.path ?? "";
    if (path.trim() === "") {
      return { valid: false, error: "Interner Pfad darf nicht leer sein (oder Link-Typ auf „Kein Link“ setzen)." };
    }
    if (!path.startsWith("/")) {
      return { valid: false, error: 'Interner Pfad muss mit "/" beginnen, z. B. "/crossfit".' };
    }
    if (path.startsWith("//")) {
      return { valid: false, error: "Interner Pfad darf nicht mit doppeltem Slash beginnen (das wäre ein externer Link)." };
    }
    if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) {
      return { valid: false, error: "Interner Pfad darf kein URL-Schema enthalten." };
    }
    return { valid: true };
  }

  // external
  const url = (link.url ?? "").trim();
  if (url === "") {
    return { valid: false, error: "Externe URL darf nicht leer sein (oder Link-Typ auf „Kein Link“ setzen)." };
  }
  if (/^\s*javascript:/i.test(url)) {
    return { valid: false, error: "javascript:-Links sind nicht erlaubt." };
  }
  if (!ALLOWED_EXTERNAL_SCHEMES.test(url)) {
    if (DANGEROUS_SCHEME.test(url)) {
      return { valid: false, error: "Nur http:// und https:// sind als externe Links erlaubt." };
    }
    return { valid: false, error: 'Externe URL muss mit "http://" oder "https://" beginnen.' };
  }
  return { valid: true };
}

/** True if the link is set and passes validateLink(). */
export function isClickable(link: PageLink | null | undefined): boolean {
  if (!link || link.kind === "none") return false;
  return validateLink(link).valid;
}

/**
 * Best-effort classification of a single raw string (e.g. a legacy plain
 * "url" field) into a PageLink. Used only for future migration/editor
 * convenience — never called automatically on existing saved content.
 */
export function classifyLinkInput(raw: string | null | undefined): PageLink {
  const value = (raw ?? "").trim();
  if (value === "") return { kind: "none" };
  if (value.startsWith("/") && !value.startsWith("//")) return { kind: "internal", path: value };
  if (ALLOWED_EXTERNAL_SCHEMES.test(value)) return { kind: "external", url: value };
  return { kind: "none" };
}

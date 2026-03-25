/**
 * Google Analytics 4 – Consent-basiert
 *
 * Lädt gtag.js NUR wenn der Nutzer im Cookie-Banner
 * unter "Analyse & Statistik" zugestimmt hat.
 *
 * Konfiguration:
 *   GA_MEASUREMENT_ID = "G-8K8KV1CXXQ"
 */

const GA_MEASUREMENT_ID = "G-8K8KV1CXXQ";
let isLoaded = false;

/** Inject the gtag.js script tag into <head> */
function loadGtagScript() {
  if (isLoaded) return;
  isLoaded = true;

  // gtag.js Loader
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // gtag init
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,         // IP-Anonymisierung
    cookie_flags: "SameSite=None;Secure",
  });
}

/** Remove GA cookies and disable tracking */
function disableGA() {
  // Set opt-out flag
  (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;

  // Remove GA cookies
  const cookiesToDelete = ["_ga", "_gid", `_ga_${GA_MEASUREMENT_ID.replace("G-", "")}`];
  cookiesToDelete.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });

  isLoaded = false;
}

/** Initialize analytics based on stored cookie consent */
export function initAnalytics() {
  // Check initial consent
  try {
    const raw = localStorage.getItem("nice_cookie_consent");
    if (raw) {
      const consent = JSON.parse(raw);
      if (consent.analytics) {
        loadGtagScript();
      }
    }
  } catch {
    // No consent stored
  }

  // Listen for consent changes
  window.addEventListener("cookie-consent-changed", ((e: CustomEvent) => {
    const consent = e.detail;
    if (consent.analytics) {
      loadGtagScript();
    } else {
      disableGA();
    }
  }) as EventListener);
}

/** Track a page view (call on route changes) */
export function trackPageView(path: string, title?: string) {
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", "page_view", {
      page_path: path,
      page_title: title || document.title,
    });
  }
}
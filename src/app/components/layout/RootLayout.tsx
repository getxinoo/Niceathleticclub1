import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { PageTransition } from "./PageTransition";
import { CookieBanner } from "../CookieBanner";
import { ScrollToTopButton } from "./ScrollToTopButton";
import { trackPageView } from "../../../lib/analytics";
import { buildGymSchema, buildWebSiteSchema, buildAggregateRatingSchema } from "../../../lib/schema";

// Einmalig gebaut – kein Re-Render nötig
const GYM_SCHEMA       = buildGymSchema();
const WEBSITE_SCHEMA   = buildWebSiteSchema();
const RATING_SCHEMA    = buildAggregateRatingSchema({ ratingValue: 4.9, reviewCount: 187 });

export function RootLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex flex-col min-h-screen relative"
      style={{ backgroundColor: "var(--surface-0)" }}
    >
      {/* ── Globale JSON-LD Schemas (auf jeder öffentlichen Seite) ── */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(GYM_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(RATING_SCHEMA)}</script>
      </Helmet>

      <Navbar />

      <div className="flex-1 flex flex-col relative">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </div>

      <Footer />
      <CookieBanner />
      <ScrollToTopButton />
    </div>
  );
}
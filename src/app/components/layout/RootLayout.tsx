import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { PageTransition } from "./PageTransition";
import { CookieBanner } from "../CookieBanner";
import { ScrollToTopButton } from "./ScrollToTopButton";
import { trackPageView } from "../../../lib/analytics";

/**
 * RootLayout
 *
 * Wraps every route. The AnimatePresence/PageTransition tandem triggers
 * a smooth fade+(subtle slide) whenever the pathname changes.
 * mode="wait" ensures the exit finishes before the next enter begins.
 */
export function RootLayout() {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex flex-col min-h-screen relative"
      style={{ backgroundColor: "var(--surface-0)" }}
    >
      <Navbar />

      {/* Flex-1 container keeps footer at the bottom regardless of page height */}
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
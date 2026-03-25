import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";

/**
 * Global Scroll-to-Top Button
 *
 * Magenta circle with ArrowUp icon. Appears after 600px scroll depth
 * with scale+fade animation. Hover glow + tap scale.
 * Rendered in RootLayout → visible on every page.
 *
 * On mobile (< 640px): hides when a sticky bottom CTA (e.g. Tagesticket)
 * is visible. Pages signal this via `document.body.dataset.mobileStickyCtaVisible`.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [ctaBlocking, setCtaBlocking] = useState(false);
  const reduced = useReducedMotion();

  const isMobile = () => window.innerWidth < 640;

  const evaluate = useCallback(() => {
    const scrolledPast = window.scrollY > 600;
    const ctaActive =
      isMobile() &&
      document.body.dataset.mobileStickyCtaVisible === "true";

    setVisible(scrolledPast);
    setCtaBlocking(ctaActive);
  }, []);

  useEffect(() => {
    // Scroll listener
    window.addEventListener("scroll", evaluate, { passive: true });

    // Listen for CTA visibility changes (custom event dispatched by pages)
    window.addEventListener("mobile-cta-change", evaluate);

    // Resize can change mobile/desktop breakpoint
    window.addEventListener("resize", evaluate, { passive: true });

    // Initial check
    evaluate();

    return () => {
      window.removeEventListener("scroll", evaluate);
      window.removeEventListener("mobile-cta-change", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, [evaluate]);

  const show = visible && !ctaBlocking;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="scroll-to-top"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 24 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={scrollToTop}
          aria-label="Nach oben scrollen"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center text-white cursor-pointer active:scale-[0.95] transition-transform"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "var(--brand)",
            border: "none",
            boxShadow:
              "0 0 25px rgba(202,12,133,0.4), 0 4px 15px rgba(0,0,0,0.3)",
          }}
          whileHover={
            reduced
              ? {}
              : {
                  scale: 1.1,
                  boxShadow:
                    "0 0 40px rgba(202,12,133,0.6), 0 6px 24px rgba(0,0,0,0.4)",
                }
          }
          whileTap={reduced ? {} : { scale: 0.92 }}
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

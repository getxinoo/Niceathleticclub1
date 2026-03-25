import { motion, useReducedMotion } from "motion/react";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition
 *
 * Wraps each route's content to produce silky-smooth page changes.
 * Used inside <AnimatePresence mode="wait"> in RootLayout.
 *
 * Accessibility: when prefers-reduced-motion is active, only opacity
 * is animated — no Y-translation occurs.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -6 }}
      transition={{
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      // Ensure the wrapper doesn't collapse on flex layouts
      // position:relative is required so Motion's useScroll can correctly
      // calculate scroll offsets when child pages use target-based scroll tracking
      style={{ minHeight: "inherit", position: "relative" }}
    >
      {children}
    </motion.div>
  );
}
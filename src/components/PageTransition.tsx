import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Subtle fade-only page transition. No vertical slide — slides cause a
 * perceptible "jump" on installed PWAs that reads as a flash. A short pure
 * opacity fade (180ms) is invisible on fast devices and barely noticeable on
 * slow ones, but still smooths route changes.
 *
 * framer-motion respects prefers-reduced-motion at OS level.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

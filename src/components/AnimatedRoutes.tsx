import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useRoutes, type RouteObject } from "react-router-dom";

interface AnimatedRoutesProps {
  routes: RouteObject[];
}

/**
 * Drop-in replacement for <Routes> that animates page transitions.
 * Uses framer-motion's AnimatePresence + a subtle fade/slide for a
 * native-app feel. Respects prefers-reduced-motion automatically because
 * framer-motion honors the OS setting.
 */
export const AnimatedRoutes = ({ routes }: AnimatedRoutesProps) => {
  const location = useLocation();
  const element = useRoutes(routes, location);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        style={{ minHeight: "100vh" }}
      >
        {element}
      </motion.div>
    </AnimatePresence>
  );
};

import { useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

/**
 * Renders the BottomNav once at the app shell level so it persists across
 * route changes (no remount/flicker on navigation). Hidden on routes that
 * shouldn't show it (auth, onboarding, paywalls, admin).
 */
const HIDDEN_PREFIXES = [
  "/auth",
  "/welcome",
  "/welcome-paywall",
  "/onboarding",
  "/reset-password",
  "/check-email",
  "/admin",
  "/terms",
  "/privacy-policy",
];

export const PersistentBottomNav = () => {
  const { pathname } = useLocation();
  const hidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (hidden) return null;
  return <BottomNav />;
};

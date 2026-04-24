const KEY_PREFIX = "swc:onboarding:done:";

export const isOnboardingComplete = (userId: string): boolean => {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${userId}`) === "1";
  } catch {
    return true;
  }
};

export const markOnboardingComplete = (userId: string): void => {
  try {
    localStorage.setItem(`${KEY_PREFIX}${userId}`, "1");
  } catch { /* noop */ }
};

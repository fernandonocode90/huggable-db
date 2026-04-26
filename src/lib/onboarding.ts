const KEY_PREFIX = "swc:onboarding:done:";
const PROFILE_PREFIX = "swc:onboarding:profile:";

export type OnboardingProfile = {
  intent?: string;        // What brings you here
  seasonOfLife?: string;  // Current season
  experience?: string;    // Faith/finance experience
  practice?: string;      // Preferred practice time
  commitment?: string;    // Daily commitment
};

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

export const saveOnboardingProfile = (userId: string, profile: OnboardingProfile): void => {
  try {
    localStorage.setItem(`${PROFILE_PREFIX}${userId}`, JSON.stringify(profile));
  } catch { /* noop */ }
};

export const getOnboardingProfile = (userId: string): OnboardingProfile | null => {
  try {
    const raw = localStorage.getItem(`${PROFILE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) as OnboardingProfile : null;
  } catch {
    return null;
  }
};

import { supabase } from "@/integrations/supabase/client";

const KEY_PREFIX = "swc:onboarding:done:";
const PROFILE_PREFIX = "swc:onboarding:profile:";
const SYNCED_PREFIX = "swc:onboarding:synced:";

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

/**
 * Persist onboarding answers to Supabase. Safe to call multiple times — uses upsert
 * by user_id. `markCompleted=true` stamps `completed_at` (call only on the last step).
 */
export const persistOnboardingToDb = async (
  userId: string,
  profile: OnboardingProfile,
  markCompleted: boolean,
): Promise<void> => {
  const payload = {
    user_id: userId,
    intent: profile.intent ?? null,
    season_of_life: profile.seasonOfLife ?? null,
    experience: profile.experience ?? null,
    practice: profile.practice ?? null,
    commitment: profile.commitment ?? null,
    ...(markCompleted ? { completed_at: new Date().toISOString() } : {}),
  };
  const { error } = await supabase
    .from("onboarding_responses")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
};

/**
 * Migrate legacy localStorage onboarding profiles into the database silently.
 * Runs once per user (gated by SYNCED flag). Failures are swallowed — best-effort.
 */
export const syncLocalOnboardingToDb = async (userId: string): Promise<void> => {
  try {
    if (localStorage.getItem(`${SYNCED_PREFIX}${userId}`) === "1") return;
    const profile = getOnboardingProfile(userId);
    const done = isOnboardingComplete(userId);
    if (!profile && !done) {
      // Nothing to sync, but don't keep retrying every load.
      localStorage.setItem(`${SYNCED_PREFIX}${userId}`, "1");
      return;
    }
    await persistOnboardingToDb(userId, profile ?? {}, done);
    localStorage.setItem(`${SYNCED_PREFIX}${userId}`, "1");
  } catch {
    /* noop — try again next load */
  }
};

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "../types";
import { saveProfile, savePublicProfile, PUBLIC_PROFILE_FIELDS } from "../lib/db";
import { normalizeProfile } from "../lib/profile";

/**
 * The signed-in user's profile. Persisted to localStorage so the (sometimes
 * lengthy) profile survives refreshes — unlike the in-memory swipe/match state.
 */
type ProfileState = {
  profile: UserProfile | null;
  /** create the profile from onboarding's required fields */
  create: (p: UserProfile) => void;
  /** patch any subset of fields from the profile editor */
  update: (patch: Partial<UserProfile>) => void;
  clear: () => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      create: (p) => {
        set({ profile: p });
        void saveProfile(p); // private write-through (no-op if disabled)
        void savePublicProfile(p); // public card mirror for discovery
      },
      update: (patch) =>
        set((s) => {
          if (!s.profile) return s;
          const next = { ...s.profile, ...patch };
          void saveProfile(next);
          // only re-mirror the public card when a public field actually changed
          // (skip discovery-only tweaks like distance/age range/filters)
          if (Object.keys(patch).some((k) => PUBLIC_PROFILE_FIELDS.includes(k as keyof typeof next))) {
            void savePublicProfile(next);
          }
          return { profile: next };
        }),
      clear: () => set({ profile: null }),
    }),
    {
      name: "amora-profile",
      // migrate the old single-`photo` shape on rehydrate
      onRehydrateStorage: () => (state) => {
        if (state?.profile) state.profile = normalizeProfile(state.profile);
      },
    },
  ),
);

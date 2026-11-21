"use client";

import { useEffect } from "react";

import { useAuthStore, useAuthStoreHasHydrated } from "@jitaspace/hooks";

import { syncPosthogIdentity } from "~/lib/posthogIdentity";

/**
 * Keeps PostHog's idea of who is signed in up to date with the stored session.
 * Renders nothing. See {@link syncPosthogIdentity} for what it sends and why.
 */
export function PosthogIdentity() {
  const hasHydrated = useAuthStoreHasHydrated();
  const selectedCharacter = useAuthStore((state) => state.selectedCharacter);
  // A string, so the effect re-runs when a character is added or removed and
  // not on every token refresh (which replaces the `characters` object).
  const characterKey = useAuthStore((state) =>
    Object.keys(state.characters)
      .map(Number)
      .sort((a, b) => a - b)
      .join(","),
  );

  useEffect(() => {
    if (!hasHydrated) return;
    syncPosthogIdentity({
      characterIds: characterKey ? characterKey.split(",").map(Number) : [],
      selectedCharacter,
    });
  }, [hasHydrated, characterKey, selectedCharacter]);

  return null;
}

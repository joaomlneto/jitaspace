"use client";

import { CharacterSsoSession, useAuthStore } from "./useAuthStore";

export const useAuthenticatedCharacter = (
  characterId: number,
): CharacterSsoSession | null => {
  return useAuthStore((state) => state.characters[characterId] ?? null);
};

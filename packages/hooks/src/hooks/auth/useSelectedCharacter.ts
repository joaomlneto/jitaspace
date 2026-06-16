"use client";

import type { CharacterSsoSession } from "./useAuthStore";
import { useAuthStore } from "./useAuthStore";

export const useSelectedCharacter = (): CharacterSsoSession | null => {
  const result = useAuthStore((state) =>
    state.selectedCharacter ? state.characters[state.selectedCharacter] : null,
  );
  return result ?? null;
};

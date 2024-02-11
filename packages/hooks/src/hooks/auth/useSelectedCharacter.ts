"use client";

import { CharacterSsoSession, useAuthStore } from "./useAuthStore";

export const useSelectedCharacter = (): CharacterSsoSession | null => {
  const result = useAuthStore((state) =>
    state.selectedCharacter ? state.characters[state.selectedCharacter] : null,
  );
  return result ?? null;
};

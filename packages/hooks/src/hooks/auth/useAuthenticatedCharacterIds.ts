"use client";

import { useAuthStore } from "./useAuthStore";

export const useAuthenticatedCharacterIds = () => {
  return useAuthStore((state) => Object.keys(state.characters).map(Number));
};

"use client";

import { useShallow } from "zustand/shallow";

import { useAuthStore } from "./useAuthStore";

export const useAuthenticatedCharacterIds = () => {
  return useAuthStore(useShallow((state) => Object.keys(state.characters).map(Number)));
};

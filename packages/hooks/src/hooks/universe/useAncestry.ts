"use client";

import { useGetAncestryById } from "@jitaspace/sde-client";

export const useAncestry = (ancestryId: number) => {
  return useGetAncestryById(ancestryId);
};

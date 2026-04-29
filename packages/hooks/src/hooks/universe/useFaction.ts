"use client";

import { useMemo } from "react";

import { useGetUniverseFactions } from "@jitaspace/esi-client";

export const useFaction = (factionId: number) => {
  const { data, ...others } = useGetUniverseFactions();

  const faction = useMemo(
    () => data?.data.find((faction) => faction.faction_id === factionId),
    [data, factionId],
  );

  return { data: faction, ...others };
};

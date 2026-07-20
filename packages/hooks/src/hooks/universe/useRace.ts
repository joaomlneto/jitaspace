"use client";

import { useMemo } from "react";

import { useGetUniverseRaces } from "@jitaspace/esi-client";

export const useRace = (raceId: number) => {
  const { data, ...others } = useGetUniverseRaces();

  const race = useMemo(
    () => data?.data.find((race) => race.race_id === raceId),
    [data, raceId],
  );

  return { data: race, ...others };
};

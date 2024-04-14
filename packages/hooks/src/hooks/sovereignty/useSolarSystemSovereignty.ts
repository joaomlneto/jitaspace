"use client";

import { useMemo } from "react";

import { useGetSovereigntyMap } from "@jitaspace/esi-client";





export const useSolarSystemSovereignty = (solarSystemId: number) => {
  const { data } = useGetSovereigntyMap();

  const solarSystemSovereignty = useMemo(() => {
    return data?.data.find((sov) => sov.system_id === solarSystemId);
  }, [data, solarSystemId]);

  return solarSystemSovereignty;
};

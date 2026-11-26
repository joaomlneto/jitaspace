"use client";

import type { Localized, SdeHookOptions, SdeSolarSystem } from "../../sde";
import { useSdeRecord } from "../../sde";

export type SolarSystem = Localized<SdeSolarSystem>;

export const useSolarSystem = (
  solarSystemId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("mapSolarSystems", solarSystemId, options);

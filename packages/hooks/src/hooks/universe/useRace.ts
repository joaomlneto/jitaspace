"use client";

import type { Localized, SdeHookOptions, SdeRace } from "../../sde";
import { useSdeRecord } from "../../sde";

export type Race = Localized<SdeRace>;

export const useRace = (raceId: number | undefined, options?: SdeHookOptions) =>
  useSdeRecord("races", raceId, options);

"use client";

import type { Localized, SdeConstellation, SdeHookOptions } from "../../sde";
import { useSdeRecord } from "../../sde";

export type Constellation = Localized<SdeConstellation>;

export const useConstellation = (
  constellationId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("mapConstellations", constellationId, options);

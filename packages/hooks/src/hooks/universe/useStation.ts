"use client";

import type { Localized, SdeHookOptions, SdeNpcStation } from "../../sde";
import { useSdeRecord } from "../../sde";

/**
 * An NPC station from the SDE. It has no name there: resolve that with
 * `useEsiName`, which ESI still serves. Player structures are `useStructure`.
 */
export type Station = Localized<SdeNpcStation>;

export const useStation = (
  stationId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("npcStations", stationId, options);

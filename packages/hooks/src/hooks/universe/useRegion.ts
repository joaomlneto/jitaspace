"use client";

import type { Localized, SdeHookOptions, SdeRegion } from "../../sde";
import { useSdeRecord, useSdeTable } from "../../sde";

export type Region = Localized<SdeRegion>;

export const useRegion = (
  regionId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("mapRegions", regionId, options);

const regionIdsOf = (regions: SdeRegion[]) =>
  regions.map((region) => region.regionID);

/**
 * Every region's id: k-space, wormhole, Abyssal and the rest — the list ESI's
 * `GET /universe/regions` used to return.
 */
export const useRegionIds = (options?: SdeHookOptions) =>
  useSdeTable("mapRegions", regionIdsOf, options);

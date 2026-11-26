"use client";

import type { Localized, SdeHookOptions, SdeStargate } from "../../sde";
import type { NamedCelestial } from "./celestial";
import { stargateName } from "../../sde";
import { useNamedCelestial } from "./celestial";

export type Stargate = NamedCelestial<"mapStargates">;

/** A stargate is named after where it leads, not where it is. */
const systemIdOf = (stargate: Localized<SdeStargate>) =>
  stargate.destination.solarSystemID;
const nameOf = (_stargate: Localized<SdeStargate>, systemName: string) =>
  stargateName(systemName);

/**
 * A stargate from the SDE, with the name EVE shows for it
 * ("Stargate (Maurasi)").
 */
export const useStargate = (
  stargateId: number | undefined,
  options?: SdeHookOptions,
) => useNamedCelestial("mapStargates", stargateId, options, systemIdOf, nameOf);

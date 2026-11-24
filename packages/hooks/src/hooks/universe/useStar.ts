"use client";

import type { Localized, SdeHookOptions, SdeStar } from "../../sde";
import type { NamedCelestial } from "./celestial";
import { starName } from "../../sde";
import { useNamedCelestial } from "./celestial";

/** A star, with its physical data under `statistics`. */
export type Star = NamedCelestial<"mapStars">;

const systemIdOf = (star: Localized<SdeStar>) => star.solarSystemID;
const nameOf = (_star: Localized<SdeStar>, systemName: string) =>
  starName(systemName);

/** A star from the SDE, with the name EVE shows for it ("Jita - Star"). */
export const useStar = (starId: number | undefined, options?: SdeHookOptions) =>
  useNamedCelestial("mapStars", starId, options, systemIdOf, nameOf);

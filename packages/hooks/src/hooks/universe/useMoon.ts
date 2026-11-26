"use client";

import type { Localized, SdeHookOptions, SdeMoon } from "../../sde";
import type { NamedCelestial } from "./celestial";
import { moonName } from "../../sde";
import { useNamedCelestial } from "./celestial";

export type Moon = NamedCelestial<"mapMoons">;

const systemIdOf = (moon: Localized<SdeMoon>) => moon.solarSystemID;
const nameOf = (moon: Localized<SdeMoon>, systemName: string) =>
  moonName(systemName, moon.celestialIndex, moon.orbitIndex);

/** A moon from the SDE, with the name EVE shows for it ("Jita IV - Moon 4"). */
export const useMoon = (moonId: number | undefined, options?: SdeHookOptions) =>
  useNamedCelestial("mapMoons", moonId, options, systemIdOf, nameOf);

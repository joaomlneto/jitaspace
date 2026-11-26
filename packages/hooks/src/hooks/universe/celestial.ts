"use client";

import { useMemo } from "react";

import type { Localized, SdeHookOptions, SdeRecords } from "../../sde";
import { useSdeRecord } from "../../sde";

type CelestialTable =
  | "mapPlanets"
  | "mapMoons"
  | "mapAsteroidBelts"
  | "mapStars"
  | "mapStargates";

/** A celestial with the name EVE shows for it, once its system has loaded. */
export type NamedCelestial<T extends CelestialTable> = Localized<
  SdeRecords[T]
> & { name?: string };

export interface NamedCelestialResult<T extends CelestialTable> {
  data: NamedCelestial<T> | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * A celestial from the SDE, named the way EVE names it. The SDE carries a name
 * only for the few celestials that have a unique one, so the rest are named
 * from a solar system (their own, or a stargate's destination) by `nameOf`.
 */
export function useNamedCelestial<T extends CelestialTable>(
  table: T,
  id: number | undefined,
  options: SdeHookOptions | undefined,
  namingSystemIdOf: (record: Localized<SdeRecords[T]>) => number | undefined,
  nameOf: (
    record: Localized<SdeRecords[T]>,
    systemName: string,
  ) => string | undefined,
): NamedCelestialResult<T> {
  const celestial = useSdeRecord(table, id, options);
  const record = celestial.data;
  // Planets, moons and asteroid belts can have one; stars and stargates never.
  const uniqueName = (record as { uniqueName?: string } | undefined)
    ?.uniqueName;
  const system = useSdeRecord(
    "mapSolarSystems",
    record ? namingSystemIdOf(record) : undefined,
    { enabled: uniqueName === undefined },
  );
  const systemName = system.data?.name;
  const data = useMemo(
    () =>
      record && {
        ...record,
        name:
          uniqueName ??
          (systemName === undefined ? undefined : nameOf(record, systemName)),
      },
    [record, uniqueName, systemName, nameOf],
  );
  return { data, isLoading: celestial.isLoading, isError: celestial.isError };
}

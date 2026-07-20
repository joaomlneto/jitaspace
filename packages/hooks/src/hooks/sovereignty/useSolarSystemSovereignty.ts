"use client";

import { useMemo } from "react";

import { useGetSovereigntySystems } from "@jitaspace/esi-client";

export interface SolarSystemSovereignty {
  system_id: number;
  alliance_id?: number;
  corporation_id?: number;
  faction_id?: number;
}

/**
 * Sovereignty owner of a solar system, flattened from the nested claim union
 * that `/sovereignty/systems` returns.
 *
 * Returns `undefined` for systems ESI reports no sovereignty for, and an entry
 * with no owner id for unclaimed K-space.
 *
 * Behaviour change (ESI compatibility date 2026-07-17): `/sovereignty/systems`
 * covers only K-space. The retired `/sovereignty/map` used to report NPC-faction
 * sovereignty for the five Drifter-hub wormhole systems — Sentinel MZ (EDENCOM),
 * Liberated Barbican (Minmatar), Sanctified Vidette (Amarr), Conflux Eyrie
 * (Caldari) and Azdaja Redoubt (Triglavian) — which now resolve to no owner, so
 * their sovereignty avatar falls back to a star. There is no replacement source.
 */
export const useSolarSystemSovereignty = (
  solarSystemId: number,
): SolarSystemSovereignty | undefined => {
  const { data } = useGetSovereigntySystems();

  return useMemo(() => {
    const system = data?.data.solar_systems.find(
      (entry) => entry.solar_system_id === solarSystemId,
    );

    if (!system) {
      return undefined;
    }

    const { claim } = system;

    if ("alliance" in claim && claim.alliance) {
      return {
        system_id: system.solar_system_id,
        alliance_id: claim.alliance.alliance_id,
        corporation_id: claim.alliance.corporation_id,
      };
    }

    if ("faction" in claim && claim.faction) {
      return {
        system_id: system.solar_system_id,
        faction_id: claim.faction.faction_id,
      };
    }

    return { system_id: system.solar_system_id };
  }, [data, solarSystemId]);
};

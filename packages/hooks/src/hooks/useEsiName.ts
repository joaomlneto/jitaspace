"use client";

import type { CacheState } from "@react-hook/cache";
import { useEffect, useMemo, useState } from "react";
import { createCache, useCache } from "@react-hook/cache";

import type { GetCharactersCharacterIdSearchQueryParamsCategoriesEnum } from "@jitaspace/esi-client";
import {
  getAlliancesAllianceId,
  getCharactersCharacterId,
  getCorporationsCorporationId,
  getUniverseConstellationsConstellationId,
  getUniverseFactions,
  getUniverseRegionsRegionId,
  getUniverseStargatesStargateId,
  getUniverseStationsStationId,
  getUniverseStructuresStructureId,
  getUniverseSystemsSystemId,
  getUniverseTypesTypeId,
  postUniverseNames,
} from "@jitaspace/esi-client";
import {
  allianceIdRanges,
  characterIdRanges,
  corporationIdRanges,
  isIdInRanges,
  stargateRanges,
  stationRanges,
} from "@jitaspace/esi-metadata";

type EsiNameCacheValue = {
  name: string;
  category:
    | GetCharactersCharacterIdSearchQueryParamsCategoriesEnum
    | "stargate";
};

export type ResolvableEntityCategory =
  | GetCharactersCharacterIdSearchQueryParamsCategoriesEnum
  | "stargate";

const inferCategoryFromId = (
  id: number,
): ResolvableEntityCategory | undefined => {
  if (isIdInRanges(id, characterIdRanges)) {
    return "character";
  }

  if (isIdInRanges(id, corporationIdRanges)) {
    return "corporation";
  }

  if (isIdInRanges(id, allianceIdRanges)) {
    return "alliance";
  }

  if (isIdInRanges(id, stargateRanges)) {
    return "stargate";
  }

  if (isIdInRanges(id, stationRanges)) {
    return "station";
  }
};

const resolveNameOfUnknownCategory = async (
  id: number | string,
): Promise<{
  name?: string;
  category: GetCharactersCharacterIdSearchQueryParamsCategoriesEnum;
}> =>
  postUniverseNames([Number(id)], {}, {}).then((data) => ({
    name: data.data[0]?.name,
    category: data.data[0]
      ?.category as GetCharactersCharacterIdSearchQueryParamsCategoriesEnum,
  }));

const resolveNameOfKnownCategory = async (
  id: number | string,
  category: ResolvableEntityCategory,
): Promise<string> => {
  switch (category) {
    case "alliance":
      return getAlliancesAllianceId(Number(id), {}, {}).then(
        (data) => data.data.name,
      );
    case "corporation":
      return getCorporationsCorporationId(Number(id), {}, {}).then(
        (data) => data.data.name,
      );
    case "agent":
    case "character":
      return getCharactersCharacterId(Number(id), {}, {}).then((data) => {
        return data.data.name;
      });
    case "inventory_type":
      return getUniverseTypesTypeId(Number(id), {}, {}).then((data) => {
        return data.data.name;
      });
    case "constellation":
      return getUniverseConstellationsConstellationId(Number(id), {}, {}).then(
        (data) => {
          return data.data.name;
        },
      );
    case "region":
      return getUniverseRegionsRegionId(Number(id), {}, {}).then((data) => {
        return data.data.name;
      });
    case "solar_system":
      return getUniverseSystemsSystemId(Number(id), {}, {}).then((data) => {
        return data.data.name;
      });
    case "faction":
      return getUniverseFactions().then((data) => {
        const faction = data.data.find(
          (faction) => faction.faction_id == Number(id),
        );
        if (faction === undefined) throw new Error("Faction ID Invalid");
        return faction.name;
      });
    case "stargate":
      return getUniverseStargatesStargateId(Number(id), {}, {}).then((data) => {
        return data.data.name;
      });
    case "station":
      return getUniverseStationsStationId(Number(id), {}, {}).then((data) => {
        return data.data.name;
      });
    case "structure":
      return getUniverseStructuresStructureId(Number(id), {}, {}).then(
        (data) => {
          return data.data.name;
        },
      );
    default:
      throw new Error(`Unknown category ${category}!`);
  }
};

// <EsiNameCacheValue, Error, [options: {
//     category?: GetCharactersCharacterIdSearchCategoriesItem | undefined;
// }]>

// Creates a fetch cache w/ a max of 10000 entries for JSON requests
const fetchCache = createCache(
  async (id, options: { category?: ResolvableEntityCategory }) => {
    if (id.length === 0) throw new Error("No ID provided");
    let name: string | undefined;

    // let's figure out the category first
    const category: ResolvableEntityCategory =
      // is the category provided?
      options.category ??
      // can we infer it from the id?
      inferCategoryFromId(typeof id === "string" ? Number(id) : id) ??
      // otherwise, we need to resolve it to get the name
      (await resolveNameOfUnknownCategory(id).then((result) => {
        // since the name is also returned, we can save it and skip fetching it in the next part
        name = result.name;
        return result.category;
      }));

    // if we already got the name, return it
    if (name) return { name, category };

    // otherwise, fetch it
    return { category, name: await resolveNameOfKnownCategory(id, category) };
  },
  100000,
);

export function useEsiName(
  id?: string | number,
  category?: ResolvableEntityCategory,
): {
  name?: string;
  category?: ResolvableEntityCategory;
  loading: boolean;
  error?: string;
} {
  const [{ status, value, error }, fetchName] = useCache(
    fetchCache,
    id === undefined ? "" : typeof id === "string" ? id : id?.toString(),
    { category },
  );

  useEffect(() => {
    if (status === "idle") {
      void fetchName();
    }
  }, [fetchName, id, status]);

  // TODO: if there was an error, try after a while(?)
  // TODO: if entry contents expired, refetch them!

  return {
    loading: status === "loading",
    name: value?.name,
    category: value?.category as ResolvableEntityCategory,
    error: error?.message,
  };
}

export function useEsiNamesCache() {
  return fetchCache.readAll();
}

export function useEsiNamePrefetch(
  entries: {
    id: number | string;
    category?: ResolvableEntityCategory;
  }[],
) {
  useEffect(() => {
    entries.forEach((entry) => {
      if (entry.id)
        void fetchCache.load(entry.id.toString(), { category: entry.category });
    });
  }, [entries]);
}

export function useEsiNames(
  names: {
    id: number;
    category?: ResolvableEntityCategory;
  }[],
) {
  const ids = useMemo(() => names.map((name) => name.id), [names]);
  const keys = useMemo(() => ids.map((id) => id.toString()), [ids]);
  const [state, setState] = useState<{
    keys: string[];
    cache: typeof fetchCache;
    current: {
      [key: string]: CacheState<EsiNameCacheValue, Error> | undefined;
    };
    //current: Record<string, CacheState<EsiNameCacheValue, Error> | undefined>;
  }>(() => {
    const current: {
      [key: string]: CacheState<EsiNameCacheValue, Error> | undefined;
    } = {};
    keys.forEach((key) => (current[key] = fetchCache.read(key)));
    console.log("initial current:", current);
    return { keys, cache: fetchCache, current };
  });

  useEffect(() => {
    let didUnsubscribe = false;

    const checkForUpdates = (
      value: CacheState<EsiNameCacheValue, Error> | undefined,
    ) => {
      console.log("got update:", value);
      if (didUnsubscribe) return;
      if (value === undefined) return;
      setState((prev) => {
        console.log("setting state");
        // Bails if our key has changed from under us
        if (!value?.id || !ids.includes(value.id)) return prev;
        // Bails if our value hasn't changed
        if (prev.current[value.id]?.value === value.value) return prev;
        return {
          ...prev,
          current: {
            ...prev.current,
            [value.id]: value,
          },
        };
      });
    };

    keys.forEach((key) => {
      console.log("subscribing to updates for key", key);
      state.cache.subscribe(key, checkForUpdates);
    });

    keys.forEach((key) => {
      console.log("checking for updates to key", key);
      checkForUpdates(state.cache.read(key));
    });

    return () => {
      didUnsubscribe = true;
      keys.forEach((key) => {
        state.cache.unsubscribe(key, checkForUpdates);
      });
    };
  }, [ids, keys, state.cache]);

  return state;
}

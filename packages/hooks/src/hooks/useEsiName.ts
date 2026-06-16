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

interface EsiNameCacheValue {
  name: string;
  category:
    | GetCharactersCharacterIdSearchQueryParamsCategoriesEnum
    | "stargate";
}

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
    default: {
      const exhaustiveCategory: never = category;
      throw new Error(`Unknown category ${String(exhaustiveCategory)}!`);
    }
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
  let idCacheKey: string;
  if (id === undefined) {
    idCacheKey = "";
  } else if (typeof id === "string") {
    idCacheKey = id;
  } else {
    idCacheKey = id.toString();
  }

  const [{ status, value, error }, fetchName] = useCache(
    fetchCache,
    idCacheKey,
    {
      category,
    },
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
    category: value?.category,
    error: error?.message,
  };
}

export function useEsiNamesCache() {
  return fetchCache.readAll();
}

export function useEsiNameLookup(
  entries: { id: number; category?: ResolvableEntityCategory }[],
) {
  useEsiNamePrefetch(entries);
  return useEsiNames(entries);
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

function makeCacheUpdater(
  key: string,
  value: CacheState<EsiNameCacheValue, Error>,
) {
  return (
    prev: Record<string, CacheState<EsiNameCacheValue, Error> | undefined>,
  ) => {
    if (prev[key]?.value === value.value) return prev;
    return { ...prev, [key]: value };
  };
}

export function useEsiNames(
  names: {
    id: number;
    category?: ResolvableEntityCategory;
  }[],
): Record<string, CacheState<EsiNameCacheValue, Error> | undefined> {
  const keys = useMemo(() => names.map((name) => name.id.toString()), [names]);
  const [current, setCurrent] = useState<
    Record<string, CacheState<EsiNameCacheValue, Error> | undefined>
  >(() => {
    const initial: Record<
      string,
      CacheState<EsiNameCacheValue, Error> | undefined
    > = {};
    keys.forEach((key) => (initial[key] = fetchCache.read(key)));
    return initial;
  });

  useEffect(() => {
    let didUnsubscribe = false;
    const callbacks = new Map<
      string,
      (v: CacheState<EsiNameCacheValue, Error> | undefined) => void
    >();

    keys.forEach((key) => {
      const callback = (
        value: CacheState<EsiNameCacheValue, Error> | undefined,
      ) => {
        if (didUnsubscribe) return;
        if (value === undefined) return;
        setCurrent(makeCacheUpdater(key, value));
      };
      callbacks.set(key, callback);
      fetchCache.subscribe(key, callback);
      callback(fetchCache.read(key));
    });

    return () => {
      didUnsubscribe = true;
      callbacks.forEach((callback, key) => {
        fetchCache.unsubscribe(key, callback);
      });
    };
  }, [keys]);

  return current;
}

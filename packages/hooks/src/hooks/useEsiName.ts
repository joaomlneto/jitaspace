"use client";

import type { CacheState } from "@react-hook/cache";
import { useEffect, useMemo, useState } from "react";
import { createCache, useCache } from "@react-hook/cache";

import type { GetCharactersCharacterIdSearchQueryParamsCategoriesEnum } from "@jitaspace/esi-client";
import {
  getAlliancesAllianceId,
  getCharactersDetail,
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

import { useEsiAcceptLanguage } from "./useEsiAcceptLanguage";

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
      return getCharactersDetail(Number(id), {}, {}).then((data) => {
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

interface EsiNameCacheArgs {
  category?: ResolvableEntityCategory;
  /**
   * The entity id to resolve. Carried in the arguments rather than parsed back
   * out of the cache key, because the key is language-scoped (see
   * {@link esiNameCacheKey}) and the id is not the whole of it.
   */
  entityId: string;
}

/**
 * Cache key for one entity's name in one language.
 *
 * ESI returns localised names for types, regions, solar systems and factions,
 * so the same id resolves to different strings under different
 * `Accept-Language` values. Scoping the key by language means a language switch
 * resolves afresh instead of serving the previous language's string, and
 * switching back reuses what was already fetched rather than refetching it.
 *
 * NUL separates the two halves so no language tag can collide with an id.
 */
const esiNameCacheKey = (entityId: string, language: string | undefined) =>
  `${language ?? ""}\u0000${entityId}`;

// Creates a fetch cache w/ a max of 10000 entries for JSON requests
const fetchCache = createCache(
  async (
    _key,
    { category: requestedCategory, entityId: id }: EsiNameCacheArgs,
  ) => {
    if (id.length === 0) throw new Error("No ID provided");
    let name: string | undefined;

    // let's figure out the category first
    const category: ResolvableEntityCategory =
      // is the category provided?
      requestedCategory ??
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
  let entityId: string;
  if (id === undefined) {
    entityId = "";
  } else if (typeof id === "string") {
    entityId = id;
  } else {
    entityId = id.toString();
  }

  const language = useEsiAcceptLanguage();
  // A language change moves this to a different cache entry, which `useCache`
  // reports as `idle` — so the effect below resolves the name afresh instead of
  // leaving the previous language's string on screen.
  const cacheKey = esiNameCacheKey(entityId, language);

  const [{ status, value, error }, fetchName] = useCache(fetchCache, cacheKey, {
    category,
    entityId,
  });

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
  const language = useEsiAcceptLanguage();

  useEffect(() => {
    entries.forEach((entry) => {
      if (!entry.id) return;
      const entityId = entry.id.toString();
      void fetchCache.load(esiNameCacheKey(entityId, language), {
        category: entry.category,
        entityId,
      });
    });
  }, [entries, language]);
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
  const language = useEsiAcceptLanguage();
  // Two identifiers per entry: the language-scoped `cacheKey` this hook reads
  // and subscribes with, and the plain `entityId` the returned record is keyed
  // by — callers index it as `names[id.toString()]`, so the language must not
  // leak into the public shape.
  const entries = useMemo(
    () =>
      names.map((name) => {
        const entityId = name.id.toString();
        return { entityId, cacheKey: esiNameCacheKey(entityId, language) };
      }),
    [names, language],
  );

  const [current, setCurrent] = useState<
    Record<string, CacheState<EsiNameCacheValue, Error> | undefined>
  >(() => {
    const initial: Record<
      string,
      CacheState<EsiNameCacheValue, Error> | undefined
    > = {};
    entries.forEach(({ entityId, cacheKey }) => {
      initial[entityId] = fetchCache.read(cacheKey);
    });
    return initial;
  });

  useEffect(() => {
    let didUnsubscribe = false;
    const callbacks = new Map<
      string,
      (v: CacheState<EsiNameCacheValue, Error> | undefined) => void
    >();

    entries.forEach(({ entityId, cacheKey }) => {
      const callback = (
        value: CacheState<EsiNameCacheValue, Error> | undefined,
      ) => {
        if (didUnsubscribe) return;
        if (value === undefined) return;
        setCurrent(makeCacheUpdater(entityId, value));
      };
      callbacks.set(cacheKey, callback);
      fetchCache.subscribe(cacheKey, callback);
      callback(fetchCache.read(cacheKey));
    });

    return () => {
      didUnsubscribe = true;
      callbacks.forEach((callback, cacheKey) => {
        fetchCache.unsubscribe(cacheKey, callback);
      });
    };
  }, [entries]);

  return current;
}

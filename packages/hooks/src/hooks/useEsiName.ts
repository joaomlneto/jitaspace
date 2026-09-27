"use client";

import type { CacheState } from "@react-hook/cache";
import { useEffect, useMemo, useState } from "react";
import { createCache, useCache } from "@react-hook/cache";

import type {
  GetCharactersCharacterIdSearchQueryParamsCategoriesEnum,
  UniverseNamesPost,
} from "@jitaspace/esi-client";
import {
  getUniverseStargatesStargateId,
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

/**
 * The categories POST /universe/names resolves. Agents are NPC characters and
 * come back as "character". Stargates and structures need their own endpoint.
 */
const UNIVERSE_NAMES_CATEGORIES = new Set<ResolvableEntityCategory>([
  "agent",
  "alliance",
  "character",
  "constellation",
  "corporation",
  "faction",
  "inventory_type",
  "region",
  "solar_system",
  "station",
]);

/** POST /universe/names takes at most this many ids per request. */
const UNIVERSE_NAMES_MAX_IDS = 1000;

/**
 * Statuses on which a batch is split rather than failed. ESI rejects the whole
 * request when any one id is unresolvable, so bisecting isolates the bad id and
 * lets the rest resolve. Not on 5xx, 420 or 429: splitting a request that
 * failed because ESI is down or rate-limiting us would multiply the load.
 */
const BISECT_ON_STATUS = new Set([400, 404]);

type UniverseName = UniverseNamesPost[number];

interface NameWaiter {
  resolve: (name: UniverseName | undefined) => void;
  reject: (error: unknown) => void;
}

let queuedIds = new Map<number, NameWaiter[]>();
let flushScheduled = false;

/**
 * Resolve one id through POST /universe/names, batched with every other id
 * requested in the same tick.
 *
 * Names used to be resolved one request per id, against an endpoint that takes
 * a thousand: a corporation hangar with 800 item types cost 800 requests, and
 * rows sat on "Unknown" while they trickled in. Every name lookup a render
 * triggers happens synchronously inside effects, so one microtask collects
 * them all.
 */
function resolveViaUniverseNames(
  id: number,
): Promise<UniverseName | undefined> {
  return new Promise((resolve, reject) => {
    const waiters = queuedIds.get(id) ?? [];
    waiters.push({ resolve, reject });
    queuedIds.set(id, waiters);
    if (!flushScheduled) {
      flushScheduled = true;
      queueMicrotask(flushUniverseNames);
    }
  });
}

function flushUniverseNames() {
  const batch = queuedIds;
  queuedIds = new Map();
  flushScheduled = false;
  const ids = [...batch.keys()];
  for (let start = 0; start < ids.length; start += UNIVERSE_NAMES_MAX_IDS) {
    void resolveUniverseNamesChunk(
      ids.slice(start, start + UNIVERSE_NAMES_MAX_IDS),
      batch,
    );
  }
}

const statusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

async function resolveUniverseNamesChunk(
  ids: number[],
  waiters: Map<number, NameWaiter[]>,
): Promise<void> {
  try {
    const response = await postUniverseNames(ids, {}, {});
    const byId = new Map(response.data.map((entry) => [entry.id, entry]));
    for (const id of ids) {
      waiters.get(id)?.forEach((waiter) => waiter.resolve(byId.get(id)));
    }
  } catch (error) {
    const status = statusOf(error);
    if (
      ids.length > 1 &&
      status !== undefined &&
      BISECT_ON_STATUS.has(status)
    ) {
      const middle = Math.ceil(ids.length / 2);
      await Promise.all([
        resolveUniverseNamesChunk(ids.slice(0, middle), waiters),
        resolveUniverseNamesChunk(ids.slice(middle), waiters),
      ]);
      return;
    }
    for (const id of ids) {
      waiters.get(id)?.forEach((waiter) => waiter.reject(error));
    }
  }
}

/** The two categories /universe/names cannot resolve. */
const resolveNameViaOwnEndpoint = async (
  id: number,
  category: "stargate" | "structure",
): Promise<string> => {
  switch (category) {
    case "stargate":
      return getUniverseStargatesStargateId(id, {}, {}).then(
        (response) => response.data.name,
      );
    case "structure":
      // `/universe/structures/{id}` needs `esi-universe.read_structures.v1` and
      // a character on the structure's access list. This cache resolves
      // without a token, so the request could only ever fail — and every
      // failure counts against ESI's error limit. Structure names come from
      // useStructure instead (see StructureName in eve-components), which
      // signs the request with a character that holds the scope.
      throw new Error(
        "Structure names need an authenticated lookup; use useStructure",
      );
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
    const numericId = Number(id);

    // A caller-supplied category wins, then one inferred from the id range;
    // /universe/names reports the category itself for anything else.
    const knownCategory = requestedCategory ?? inferCategoryFromId(numericId);
    if (
      knownCategory !== undefined &&
      !UNIVERSE_NAMES_CATEGORIES.has(knownCategory)
    ) {
      const ownEndpointCategory = knownCategory as "stargate" | "structure";
      return {
        category: ownEndpointCategory,
        name: await resolveNameViaOwnEndpoint(numericId, ownEndpointCategory),
      };
    }

    const resolved = await resolveViaUniverseNames(numericId);
    if (!resolved) throw new Error(`ESI returned no name for ${id}`);
    return {
      name: resolved.name,
      category: knownCategory ?? resolved.category,
    };
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
      const cacheKey = esiNameCacheKey(entityId, language);
      // The cache's `load` only short-circuits while a key is still loading —
      // a resolved one is fetched again. Callers rebuild `entries` whenever
      // their data changes (each debounced search, each assets page), so
      // without this every name already on screen was re-requested each time.
      if (fetchCache.read(cacheKey)?.status === "success") return;
      void fetchCache.load(cacheKey, { category: entry.category, entityId });
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

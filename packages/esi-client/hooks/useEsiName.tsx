import { useEffect } from "react";
import { createCache, useCache } from "@react-hook/cache";

import {
  getAlliancesAllianceId,
  getCharactersCharacterId,
  getCorporationsCorporationId,
  getUniverseConstellationsConstellationId,
  getUniverseFactions,
  getUniverseRegionsRegionId,
  getUniverseStationsStationId,
  getUniverseStructuresStructureId,
  getUniverseSystemsSystemId,
  getUniverseTypesTypeId,
  postUniverseNames,
  type GetCharactersCharacterIdSearchCategoriesItem,
} from "../client";
import {
  allianceIdRanges,
  characterIdRanges,
  corporationIdRanges,
  isIdInRanges,
} from "../utils";

export type ResolvableEntityCategory =
  GetCharactersCharacterIdSearchCategoriesItem;

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
};

const resolveNameOfUnknownCategory = async (
  id: number | string,
): Promise<{ name?: string; category: ResolvableEntityCategory }> =>
  postUniverseNames([Number(id)], {}, {}).then((data) => ({
    name: data.data[0]?.name,
    category: data.data[0]?.category as ResolvableEntityCategory,
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
  10000,
);

export function useEsiName(
  id?: string | number,
  category?: ResolvableEntityCategory,
): {
  name?: string;
  category?: ResolvableEntityCategory;
  loading: boolean;
  error?: string;
  otherStuff?: object;
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
    //otherStuff: { status, value, error, cancel },
    error: error?.message,
  };
}

export function useEsiNamesCache() {
  return fetchCache.readAll();
}
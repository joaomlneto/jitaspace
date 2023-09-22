import {
  scrapeEsiCategories,
  scrapeEsiConstellations,
  scrapeEsiDogmaAttributes,
  scrapeEsiDogmaEffects,
  scrapeEsiGroups,
  scrapeEsiMarketGroups,
  scrapeEsiMoons,
  scrapeEsiPlanets,
  scrapeEsiRegions,
  scrapeEsiSolarSystems,
  scrapeEsiTypes,
} from "./scrape";
import { testPing } from "./test";

export const functions = [
  testPing,
  scrapeEsiCategories,
  scrapeEsiConstellations,
  scrapeEsiDogmaAttributes,
  scrapeEsiDogmaEffects,
  scrapeEsiGroups,
  scrapeEsiMarketGroups,
  scrapeEsiMoons,
  scrapeEsiPlanets,
  scrapeEsiRegions,
  scrapeEsiSolarSystems,
  scrapeEsiTypes,
];

export * from "./scrape";
export * from "./test";

import {
  scrapeEsiCategories,
  scrapeEsiConstellations,
  scrapeEsiDogmaAttributes,
  scrapeEsiDogmaEffects,
  scrapeEsiGroups,
  scrapeEsiMarketGroups,
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
  scrapeEsiRegions,
  scrapeEsiSolarSystems,
  scrapeEsiTypes,
];

export * from "./scrape";
export * from "./test";

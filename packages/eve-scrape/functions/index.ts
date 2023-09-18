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
  scrapeEsiTypesPage,
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
  scrapeEsiTypesPage,
];

export * from "./scrape";
export * from "./test";

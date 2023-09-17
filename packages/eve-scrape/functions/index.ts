import {
  scrapeEsiConstellations,
  scrapeEsiMarketGroups,
  scrapeEsiRegions,
  scrapeEsiSolarSystems,
} from "./scrape";
import { testPing } from "./test";

export const functions = [
  testPing,
  scrapeEsiMarketGroups,
  scrapeEsiConstellations,
  scrapeEsiRegions,
  scrapeEsiSolarSystems,
];

export * from "./scrape";
export * from "./test";

import fs from "node:fs";
import * as path from "node:path";
import * as YAML from "js-yaml";

import { SDE_PATH } from "../commands/generate.js";
import { TITLE_WIDTH, getWorkingDirectory } from "../lib/cli.js";
import { globalProgress } from "../lib/progress.js";

/**
 * This is a special file that parses and flattens the contents of the `universe` folder.
 */
export const sdeUniverseSources = [
  "asteroidBelts",
  "constellations",
  "moons",
  "planets",
  "regions",
  "solarSystems",
  "stargates",
  "stars",
];

export type SdeUniverseSource = (typeof sdeUniverseSources)[number];

const sdeUniverseData: Record<SdeUniverseSource, Record<string, object>> = {
  asteroidBelts: {},
  constellations: {},
  moons: {},
  planets: {},
  regions: {},
  solarSystems: {},
  stargates: {},
  stars: {},
};
let sdeUniverseSourcesLoaded = false;

/**
 * Load the SDE universe files.
 */
export async function loadSdeUniverseSources() {
  if (sdeUniverseSourcesLoaded) {
    return;
  }

  const sdePath = path.resolve(getWorkingDirectory(), SDE_PATH);

  const universeNames = fs
    .readdirSync(path.join(sdePath, "universe"))
    .filter((name) => name !== "landmarks");

  for (const universeName of universeNames) {
    const universePath = path.join(sdePath, "universe", universeName);
    const regionNames = fs.readdirSync(universePath);
    const universeProgress = globalProgress.create(regionNames.length, 0, {
      title: `Parsing ${universeName} regions`.padEnd(TITLE_WIDTH),
    });
    globalProgress.update();
    for (const regionName of regionNames) {
      const regionPath = path.join(universePath, regionName);

      let region = YAML.load(
        fs.readFileSync(path.join(regionPath, "region.yaml"), "utf8"),
      );
      // @ts-expect-error
      region.universeID = universeName;
      // @ts-expect-error
      sdeUniverseData.regions[region.regionID] = region;

      const constellationNames = fs
        .readdirSync(regionPath)
        .filter((file) => !file.endsWith(".yaml"));
      for (const constellationName of constellationNames) {
        const constellationPath = path.join(regionPath, constellationName);

        let constellation = YAML.load(
          fs.readFileSync(
            path.join(constellationPath, "constellation.yaml"),
            "utf8",
          ),
        );
        // @ts-expect-error
        constellation.regionID = region.regionID;

        // @ts-expect-error
        sdeUniverseData.constellations[constellation.constellationID] =
          constellation;

        const solarSystemNames = fs
          .readdirSync(constellationPath)
          .filter((file) => !file.endsWith(".yaml"));
        for (const solarSystemName of solarSystemNames) {
          const solarSystemPath = path.join(constellationPath, solarSystemName);

          let solarSystem = YAML.load(
            fs.readFileSync(
              path.join(solarSystemPath, "solarsystem.yaml"),
              "utf8",
            ),
          );
          // @ts-expect-error
          solarSystem.constellationID = constellation.constellationID;
          // @ts-expect-error
          solarSystem.regionID = region.regionID;

          // @ts-expect-error
          sdeUniverseData.solarSystems[solarSystem.solarSystemID] = solarSystem;

          // @ts-expect-error
          Object.keys(solarSystem.planets).forEach((planetID) => {
            // @ts-expect-error
            const planet = solarSystem.planets[planetID];
            // @ts-expect-error
            planet.solarSystemID = solarSystem.solarSystemID;
            // @ts-expect-error
            planet.constellationID = constellation.constellationID;
            // @ts-expect-error
            planet.regionID = region.regionID;
            // @ts-expect-error
            sdeUniverseData.planets[planetID] = planet;

            // moons
            Object.keys(planet.moons ?? {}).forEach((moonID) => {
              const moon = planet.moons[moonID];
              moon.planetID = planetID;
              // @ts-expect-error
              moon.solarSystemID = solarSystem.solarSystemID;
              // @ts-expect-error
              moon.constellationID = constellation.constellationID;
              // @ts-expect-error
              moon.regionID = region.regionID;
              // @ts-expect-error
              sdeUniverseData.moons[moonID] = moon;
            });
            planet.moons = Object.keys(planet.moons ?? {});

            // asteroid belts
            Object.keys(planet.asteroidBelts ?? {}).forEach(
              (asteroidBeltID) => {
                const asteroidBelt = planet.asteroidBelts[asteroidBeltID];
                asteroidBelt.planetID = planetID;
                // @ts-expect-error
                asteroidBelt.solarSystemID = solarSystem.solarSystemID;
                // @ts-expect-error
                asteroidBelt.constellationID = constellation.constellationID;
                // @ts-expect-error
                asteroidBelt.regionID = region.regionID;
                // @ts-expect-error
                sdeUniverseData.asteroidBelts[asteroidBeltID] = asteroidBelt;
              },
            );
            planet.asteroidBelts = Object.keys(planet.asteroidBelts ?? {});
          });
          // @ts-expect-error
          solarSystem.planets = Object.keys(solarSystem.planets);

          // @ts-expect-error
          Object.keys(solarSystem.stargates ?? {}).forEach((stargateID) => {
            // @ts-expect-error
            const stargate = solarSystem.stargates[stargateID];
            // @ts-expect-error
            stargate.solarSystemID = solarSystem.solarSystemID;
            // @ts-expect-error
            stargate.constellationID = constellation.constellationID;
            // @ts-expect-error
            stargate.regionID = region.regionID;
            // @ts-expect-error
            sdeUniverseData.stargates[stargateID] = stargate;
          });
          // @ts-expect-error
          solarSystem.stargates = Object.keys(solarSystem.stargates);

          // @ts-expect-error
          if (solarSystem.star) {
            // @ts-expect-error
            const star = solarSystem.star;
            // @ts-expect-error
            star.solarSystemID = solarSystem.solarSystemID;
            // @ts-expect-error
            star.constellationID = constellation.constellationID;
            // @ts-expect-error
            star.regionID = region.regionID;
            // @ts-expect-error
            sdeUniverseData.stars[solarSystem.star.id] = star;
          }
        }
      }
      universeProgress.increment();
      globalProgress.update();
    }
    globalProgress.remove(universeProgress);
    globalProgress.update();
  }

  sdeUniverseSourcesLoaded = true;
}

export async function getUniverseSourceData(
  source: SdeUniverseSource,
): Promise<Record<string, object>> {
  await loadSdeUniverseSources();
  const data = sdeUniverseData[source];
  if (!data) {
    throw new Error(`Universe source ${source} not found`);
  }
  return data;
}

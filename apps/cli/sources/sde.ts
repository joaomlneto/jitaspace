import fs from "fs";
import path from "path";
import * as YAML from "js-yaml";

import { globalProgress } from "../lib/progress";

/**
 * Information about the structure of the SDE files.
 */

export type SdeSourceFile = {
  // The name of the attribute that will be used as the ID
  idAttributeName: string;
  // The type of the ID attribute
  idAttributeType: "string" | "number";
  // List of transformations to apply to the data upon loading it, so that it is
  // a map of ID -> object
  transformations: ((data: any, file: SdeSourceFile) => any)[];
};

/**
 * The list of SDE files to be loaded, and transformations to be applied to them,
 * so they are all a map of ID -> object.
 */
export const sdeInputFiles: Record<string, SdeSourceFile> = {
  "_sde.yaml": {
    idAttributeName: "XXXX", // Dummy value, this file does not have an ID
    idAttributeType: "number",
    transformations: [],
  },
  "invFlags.yaml": {
    idAttributeName: "flagID",
    idAttributeType: "number",
    transformations: [fromArrayOfObjectsToMap],
  },
  "agents.yaml": {
    idAttributeName: "characterID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "agentsInSpace.yaml": {
    idAttributeName: "characterID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "agentTypes.yaml": {
    idAttributeName: "agentTypeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "ancestries.yaml": {
    idAttributeName: "ancestryID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "bloodlines.yaml": {
    idAttributeName: "bloodlineID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "blueprints.yaml": {
    idAttributeName: "blueprintTypeID",
    idAttributeType: "number",
    transformations: [],
  },
  "categories.yaml": {
    idAttributeName: "categoryID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "certificates.yaml": {
    idAttributeName: "certificateID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "characterAttributes.yaml": {
    idAttributeName: "attributeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "contrabandTypes.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "controlTowerResources.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "corporationActivities.yaml": {
    idAttributeName: "corporationActivityID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "dbuffCollections.yaml": {
    idAttributeName: "dbuffCollectionID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "dogmaAttributeCategories.yaml": {
    idAttributeName: "attributeCategoryID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "dogmaAttributes.yaml": {
    idAttributeName: "attributeID",
    idAttributeType: "number",
    transformations: [],
  },
  "dogmaEffects.yaml": {
    idAttributeName: "effectID",
    idAttributeType: "number",
    transformations: [],
  },
  "dogmaUnits.yaml": {
    idAttributeName: "unitID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "dynamicItemAttributes.yaml": {
    idAttributeName: "dynamicItemAttributeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "factions.yaml": {
    idAttributeName: "factionID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "graphics.yaml": {
    idAttributeName: "graphicID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "groups.yaml": {
    idAttributeName: "groupID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "icons.yaml": {
    idAttributeName: "iconID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "landmarks.yaml": {
    idAttributeName: "landmarkID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapAsteroidBelts.yaml": {
    idAttributeName: "asteroidBeltID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapConstellations.yaml": {
    idAttributeName: "constellationID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapMoons.yaml": {
    idAttributeName: "moonID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapPlanets.yaml": {
    idAttributeName: "planetID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapRegions.yaml": {
    idAttributeName: "regionID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapSolarSystems.yaml": {
    idAttributeName: "solarSystemID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapStargates.yaml": {
    idAttributeName: "stargateID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "mapStars.yaml": {
    idAttributeName: "starID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "marketGroups.yaml": {
    idAttributeName: "marketGroupID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "masteries.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "metaGroups.yaml": {
    idAttributeName: "metaGroupID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "npcCorporationDivisions.yaml": {
    idAttributeName: "npcCorporationDivisionID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "npcCorporations.yaml": {
    idAttributeName: "corporationID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "npcStations.yaml": {
    idAttributeName: "stationID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "planetSchematics.yaml": {
    idAttributeName: "planetSchematicID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "races.yaml": {
    idAttributeName: "raceID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "researchAgents.yaml": {
    idAttributeName: "characterID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "skinLicenses.yaml": {
    idAttributeName: "licenseTypeID",
    idAttributeType: "number",
    transformations: [],
  },
  "skinMaterials.yaml": {
    idAttributeName: "skinMaterialID",
    idAttributeType: "number",
    transformations: [],
  },
  "skins.yaml": {
    idAttributeName: "skinID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "stationOperations.yaml": {
    idAttributeName: "stationOperationID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "stationServices.yaml": {
    idAttributeName: "stationServiceID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "translationLanguages.yaml": {
    idAttributeName: "translationLanguageID",
    idAttributeType: "string",
    transformations: [],
  },
  "typeBonus.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "typeDogma.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "types.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "typeMaterials.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "planetResources.yaml": {
    idAttributeName: "planetID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "sovereigntyUpgrades.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
};

// Converts an array of objects in the format [obj1, obj2, obj3] to {[obj1.id]: obj1, [obj2.id]: obj2, [obj3.id]: obj3}
export function fromArrayOfObjectsToMap(
  array: Record<any, any>[],
  { idAttributeName }: SdeSourceFile,
) {
  const map: Record<any, any> = {};

  array.forEach((item) => {
    if (!item.hasOwnProperty(idAttributeName)) {
      throw new Error(`⚠️ Missing ID ${idAttributeName}`);
    }
    if (map.hasOwnProperty(item[idAttributeName])) {
      // FIXME: Downgraded to error due to existence of ID Collisions
      //throw new Error(`⚠️ Duplicate ID ${item[idAttributeName]}`);
      globalProgress.log(`⚠️ Duplicate ID ${item[idAttributeName]}\n`);
      //console.error(`⚠️ Duplicate ID ${item[idAttributeName]}`);
    }
    map[item[idAttributeName]] = item;
    return map[item[idAttributeName]];
  });
  return map;
}

// given a map of {key: obj, ...} returns the same map but with the key as an attribute of the object
export function addIdToItem(
  obj: Record<any, any>,
  { idAttributeName, idAttributeType }: SdeSourceFile,
) {
  Object.keys(obj).forEach(
    (id) =>
      (obj[id][idAttributeName] =
        idAttributeType === "number" ? parseInt(id) : id),
  );
  return obj;
}

// If the keys of the object do not match those of the ID attribute, this will fix it!
export function fixObjectIndices(
  obj: Record<any, any>,
  { idAttributeName }: { idAttributeName: string },
) {
  const result: typeof obj = {};
  Object.values(obj).forEach(
    (entry) => (result[entry[idAttributeName]] = entry),
  );
  return result;
}

export function loadFile(
  filename: keyof typeof sdeInputFiles,
  sdeRoot: string,
): Record<string, any> {
  const file = sdeInputFiles[filename];

  if (!file) {
    throw new Error(`File ${filename} not found in sdeInputFiles`);
  }

  // Read file
  const filePath = path.join(sdeRoot, filename);
  let data: any = YAML.load(fs.readFileSync(filePath, "utf8"));

  // Apply transformations
  for (const transformation of file.transformations) {
    data = transformation(data, file);
  }

  return data;
}

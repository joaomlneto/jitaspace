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
  "bsd/invFlags.yaml": {
    idAttributeName: "flagID",
    idAttributeType: "number",
    transformations: [fromArrayOfObjectsToMap],
  },
  "bsd/invItems.yaml": {
    idAttributeName: "itemID",
    idAttributeType: "number",
    transformations: [fromArrayOfObjectsToMap],
  },
  "bsd/invNames.yaml": {
    idAttributeName: "itemID",
    idAttributeType: "number",
    transformations: [fromArrayOfObjectsToMap],
  },
  "bsd/invPositions.yaml": {
    idAttributeName: "itemID",
    idAttributeType: "number",
    transformations: [fromArrayOfObjectsToMap],
  },
  "bsd/invUniqueNames.yaml": {
    idAttributeName: "itemID",
    idAttributeType: "number",
    transformations: [fromArrayOfObjectsToMap],
  },
  "bsd/staStations.yaml": {
    idAttributeName: "stationID",
    idAttributeType: "number",
    transformations: [fromArrayOfObjectsToMap],
  },
  "fsd/agents.yaml": {
    idAttributeName: "characterID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/agentsInSpace.yaml": {
    idAttributeName: "characterID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/ancestries.yaml": {
    idAttributeName: "ancestryID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/bloodlines.yaml": {
    idAttributeName: "bloodlineID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/blueprints.yaml": {
    idAttributeName: "blueprintTypeID",
    idAttributeType: "number",
    transformations: [],
  },
  "fsd/categories.yaml": {
    idAttributeName: "categoryID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/certificates.yaml": {
    idAttributeName: "certificateID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/characterAttributes.yaml": {
    idAttributeName: "attributeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/contrabandTypes.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/controlTowerResources.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/corporationActivities.yaml": {
    idAttributeName: "corporationActivityID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/dogmaAttributeCategories.yaml": {
    idAttributeName: "attributeCategoryID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/dogmaAttributes.yaml": {
    idAttributeName: "attributeID",
    idAttributeType: "number",
    transformations: [],
  },
  "fsd/dogmaEffects.yaml": {
    idAttributeName: "effectID",
    idAttributeType: "number",
    transformations: [],
  },
  "fsd/factions.yaml": {
    idAttributeName: "factionID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/graphicIDs.yaml": {
    idAttributeName: "graphicID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/groups.yaml": {
    idAttributeName: "groupID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/iconIDs.yaml": {
    idAttributeName: "iconID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "universe/landmarks/landmarks.yaml": {
    idAttributeName: "landmarkID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/marketGroups.yaml": {
    idAttributeName: "marketGroupID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/metaGroups.yaml": {
    idAttributeName: "metaGroupID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/npcCorporationDivisions.yaml": {
    idAttributeName: "npcCorporationDivisionID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/npcCorporations.yaml": {
    idAttributeName: "corporationID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/planetSchematics.yaml": {
    idAttributeName: "planetSchematicID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/races.yaml": {
    idAttributeName: "raceID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/researchAgents.yaml": {
    idAttributeName: "characterID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/skinLicenses.yaml": {
    idAttributeName: "licenseTypeID",
    idAttributeType: "number",
    transformations: [],
  },
  "fsd/skinMaterials.yaml": {
    idAttributeName: "skinMaterialID",
    idAttributeType: "number",
    transformations: [],
  },
  "fsd/stationOperations.yaml": {
    idAttributeName: "stationOperationID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/stationServices.yaml": {
    idAttributeName: "stationServiceID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/tournamentRuleSets.yaml": {
    idAttributeName: "ruleSetID",
    idAttributeType: "string",
    transformations: [fromArrayOfObjectsToMap],
  },
  "fsd/translationLanguages.yaml": {
    idAttributeName: "translationLanguageID",
    idAttributeType: "string",
    transformations: [],
  },
  "fsd/typeDogma.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/types.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/typeMaterials.yaml": {
    idAttributeName: "typeID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/planetResources.yaml": {
    idAttributeName: "planetID",
    idAttributeType: "number",
    transformations: [addIdToItem],
  },
  "fsd/sovereigntyUpgrades.yaml": {
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

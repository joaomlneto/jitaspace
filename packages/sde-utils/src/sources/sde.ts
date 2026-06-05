import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as YAML from "js-yaml";

export type SdeRecord = Record<string | number, unknown>;

export type SdeSourceFile = {
  idAttributeName: string;
  idAttributeType: "string" | "number";
  transformations: ((data: unknown, file: SdeSourceFile) => SdeRecord)[];
};

// Builder helpers to cut repetition in sdeInputFiles
const addId = (idAttributeName: string): SdeSourceFile => ({
  idAttributeName,
  idAttributeType: "number",
  transformations: [addIdToItem],
});

const noTransform = (
  idAttributeName: string,
  idAttributeType: SdeSourceFile["idAttributeType"] = "number",
): SdeSourceFile => ({
  idAttributeName,
  idAttributeType,
  transformations: [],
});

export const sdeInputFiles: Record<string, SdeSourceFile> = {
  "_sde.yaml": noTransform("XXXX"),
  "agentTypes.yaml": addId("agentTypeID"),
  "agentsInSpace.yaml": addId("characterID"),
  "ancestries.yaml": addId("ancestryID"),
  "archetypes.yaml": addId("archetypeID"),
  "bloodlines.yaml": addId("bloodlineID"),
  "blueprints.yaml": noTransform("blueprintTypeID"),
  "categories.yaml": addId("categoryID"),
  "certificates.yaml": addId("certificateID"),
  "characterAttributes.yaml": addId("attributeID"),
  "cloneGrades.yaml": addId("cloneGradeID"),
  "compressibleTypes.yaml": addId("typeID"),
  "contrabandTypes.yaml": addId("typeID"),
  "controlTowerResources.yaml": addId("typeID"),
  "corporationActivities.yaml": addId("corporationActivityID"),
  "dbuffCollections.yaml": addId("dbuffCollectionID"),
  "dogmaAttributeCategories.yaml": addId("attributeCategoryID"),
  "dogmaAttributes.yaml": noTransform("attributeID"),
  "dogmaEffects.yaml": noTransform("effectID"),
  "dogmaUnits.yaml": addId("unitID"),
  "dungeons.yaml": addId("dungeonID"),
  "dynamicItemAttributes.yaml": addId("dynamicItemAttributeID"),
  "factions.yaml": addId("factionID"),
  "freelanceJobSchemas.yaml": addId("freelanceJobSchemaGroupID"),
  "graphics.yaml": addId("graphicID"),
  "groups.yaml": addId("groupID"),
  "icons.yaml": addId("iconID"),
  "landmarks.yaml": addId("landmarkID"),
  "mapAsteroidBelts.yaml": addId("asteroidBeltID"),
  "mapConstellations.yaml": addId("constellationID"),
  "mapMoons.yaml": addId("moonID"),
  "mapPlanets.yaml": addId("planetID"),
  "mapRegions.yaml": addId("regionID"),
  "mapSecondarySuns.yaml": addId("secondarySunID"),
  "mapSolarSystems.yaml": addId("solarSystemID"),
  "mapStargates.yaml": addId("stargateID"),
  "mapStars.yaml": addId("starID"),
  "marketGroups.yaml": addId("marketGroupID"),
  "masteries.yaml": addId("typeID"),
  "mercenaryTacticalOperations.yaml": addId("mercenaryTacticalOperationID"),
  "metaGroups.yaml": addId("metaGroupID"),
  "npcCharacters.yaml": addId("characterID"),
  "npcCorporationDivisions.yaml": addId("npcCorporationDivisionID"),
  "npcCorporations.yaml": addId("corporationID"),
  "npcStations.yaml": addId("stationID"),
  "planetResources.yaml": addId("planetID"),
  "planetSchematics.yaml": addId("planetSchematicID"),
  "races.yaml": addId("raceID"),
  "skinLicenses.yaml": noTransform("licenseTypeID"),
  "skinMaterials.yaml": noTransform("skinMaterialID"),
  "skins.yaml": addId("skinID"),
  "sovereigntyUpgrades.yaml": addId("typeID"),
  "stationOperations.yaml": addId("stationOperationID"),
  "stationServices.yaml": addId("stationServiceID"),
  "translationLanguages.yaml": noTransform("translationLanguageID", "string"),
  "typeBonus.yaml": addId("typeID"),
  "typeDogma.yaml": addId("typeID"),
  "typeLists.yaml": addId("typeListID"),
  "typeMaterials.yaml": addId("typeID"),
  "types.yaml": addId("typeID"),
};

export function fromArrayOfObjectsToMap(
  data: unknown,
  { idAttributeName }: SdeSourceFile,
): SdeRecord {
  const array = data as SdeRecord[];
  const map: SdeRecord = {};

  for (const item of array) {
    if (!Object.hasOwn(item as object, idAttributeName)) {
      throw new Error(`⚠️ Missing ID ${idAttributeName}`);
    }
    const id = item[idAttributeName] as string | number;
    if (Object.hasOwn(map as object, id)) {
      // Duplicate IDs exist in the SDE data itself; warn instead of throwing
      console.warn(`⚠️ Duplicate ID ${id}`);
    }
    map[id] = item;
  }
  return map;
}

export function addIdToItem(
  data: unknown,
  { idAttributeName, idAttributeType }: SdeSourceFile,
): SdeRecord {
  const obj = data as Record<string, SdeRecord>;
  for (const id of Object.keys(obj)) {
    obj[id]![idAttributeName] =
      idAttributeType === "number" ? Number.parseInt(id, 10) : id;
  }
  return obj;
}

export function fixObjectIndices(
  obj: SdeRecord,
  { idAttributeName }: { idAttributeName: string },
): SdeRecord {
  const result: SdeRecord = {};
  for (const entry of Object.values(obj)) {
    const item = entry as SdeRecord;
    const id = item[idAttributeName] as string | number;
    result[id] = item;
  }
  return result;
}

export function loadFile(
  filename: keyof typeof sdeInputFiles,
  sdeRoot: string,
): SdeRecord {
  const file = sdeInputFiles[filename];

  if (!file) {
    throw new Error(`File ${filename} not found in sdeInputFiles`);
  }

  const filePath = join(sdeRoot, filename);
  let data: unknown = YAML.load(readFileSync(filePath, "utf8"));

  for (const transformation of file.transformations) {
    data = transformation(data, file);
  }

  return data as SdeRecord;
}

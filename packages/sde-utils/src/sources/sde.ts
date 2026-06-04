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

const fromArr = (idAttributeName: string): SdeSourceFile => ({
  idAttributeName,
  idAttributeType: "number",
  transformations: [fromArrayOfObjectsToMap],
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
  "invFlags.yaml": fromArr("flagID"),
  "npcCharacters.yaml": addId("characterID"),
  "agentsInSpace.yaml": addId("characterID"),
  "agentTypes.yaml": addId("agentTypeID"),
  "ancestries.yaml": addId("ancestryID"),
  "bloodlines.yaml": addId("bloodlineID"),
  "blueprints.yaml": noTransform("blueprintTypeID"),
  "categories.yaml": addId("categoryID"),
  "certificates.yaml": addId("certificateID"),
  "characterAttributes.yaml": addId("attributeID"),
  "contrabandTypes.yaml": addId("typeID"),
  "controlTowerResources.yaml": addId("typeID"),
  "corporationActivities.yaml": addId("corporationActivityID"),
  "dbuffCollections.yaml": addId("dbuffCollectionID"),
  "dogmaAttributeCategories.yaml": addId("attributeCategoryID"),
  "dogmaAttributes.yaml": noTransform("attributeID"),
  "dogmaEffects.yaml": noTransform("effectID"),
  "dogmaUnits.yaml": addId("unitID"),
  "dynamicItemAttributes.yaml": addId("dynamicItemAttributeID"),
  "factions.yaml": addId("factionID"),
  "graphics.yaml": addId("graphicID"),
  "groups.yaml": addId("groupID"),
  "icons.yaml": addId("iconID"),
  "landmarks.yaml": addId("landmarkID"),
  "mapAsteroidBelts.yaml": addId("asteroidBeltID"),
  "mapConstellations.yaml": addId("constellationID"),
  "mapMoons.yaml": addId("moonID"),
  "mapPlanets.yaml": addId("planetID"),
  "mapRegions.yaml": addId("regionID"),
  "mapSolarSystems.yaml": addId("solarSystemID"),
  "mapStargates.yaml": addId("stargateID"),
  "mapStars.yaml": addId("starID"),
  "marketGroups.yaml": addId("marketGroupID"),
  "masteries.yaml": addId("typeID"),
  "metaGroups.yaml": addId("metaGroupID"),
  "npcCorporationDivisions.yaml": addId("npcCorporationDivisionID"),
  "npcCorporations.yaml": addId("corporationID"),
  "npcStations.yaml": addId("stationID"),
  "planetSchematics.yaml": addId("planetSchematicID"),
  "races.yaml": addId("raceID"),
  "skinLicenses.yaml": noTransform("licenseTypeID"),
  "skinMaterials.yaml": noTransform("skinMaterialID"),
  "skins.yaml": addId("skinID"),
  "stationOperations.yaml": addId("stationOperationID"),
  "stationServices.yaml": addId("stationServiceID"),
  "translationLanguages.yaml": noTransform("translationLanguageID", "string"),
  "typeBonus.yaml": addId("typeID"),
  "typeDogma.yaml": addId("typeID"),
  "types.yaml": addId("typeID"),
  "typeMaterials.yaml": addId("typeID"),
  "planetResources.yaml": addId("planetID"),
  "sovereigntyUpgrades.yaml": addId("typeID"),
};

export function fromArrayOfObjectsToMap(
  data: unknown,
  { idAttributeName }: SdeSourceFile,
): SdeRecord {
  const array = data as SdeRecord[];
  const map: SdeRecord = {};

  for (const item of array) {
    if (!Object.prototype.hasOwnProperty.call(item, idAttributeName)) {
      throw new Error(`⚠️ Missing ID ${idAttributeName}`);
    }
    const id = item[idAttributeName] as string | number;
    if (Object.prototype.hasOwnProperty.call(map, id)) {
      // FIXME: Downgraded to warning due to existence of ID collisions in the SDE
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

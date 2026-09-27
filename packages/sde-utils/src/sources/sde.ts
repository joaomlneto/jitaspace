import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as YAML from "js-yaml";

export type SdeRecord = Record<string | number, unknown>;

export interface SdeSourceFile {
  idAttributeName: string;
  idAttributeType: "string" | "number";
  transformations: ((data: unknown, file: SdeSourceFile) => SdeRecord)[];
}

// Builder helpers to cut repetition in sdeInputFiles
const addId = (
  idAttributeName: string,
  idAttributeType: SdeSourceFile["idAttributeType"] = "number",
): SdeSourceFile => ({
  idAttributeName,
  idAttributeType,
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
  "accountingEntryTypes.yaml": addId("accountingEntryTypeID"),
  "agentTypes.yaml": addId("agentTypeID"),
  "agentsInSpace.yaml": addId("characterID"),
  "ancestries.yaml": addId("ancestryID"),
  "appliedProximityEffects.yaml": addId("typeID"),
  "archetypes.yaml": addId("archetypeID"),
  "bloodlines.yaml": addId("bloodlineID"),
  "blueprints.yaml": noTransform("blueprintTypeID"),
  "categories.yaml": addId("categoryID"),
  "certificates.yaml": addId("certificateID"),
  "characterAttributes.yaml": addId("attributeID"),
  "characterTitles.yaml": noTransform("characterTitleID", "string"),
  "cloneGrades.yaml": addId("cloneGradeID"),
  "compressibleTypes.yaml": addId("typeID"),
  "contrabandTypes.yaml": addId("typeID"),
  "controlTowerResources.yaml": addId("typeID"),
  "corporationActivities.yaml": addId("corporationActivityID"),
  "corporationRoleGroups.yaml": addId("corporationRoleGroupID"),
  "corporationRoles.yaml": addId("corporationRoleID"),
  "dbuffCollections.yaml": addId("dbuffCollectionID"),
  "dogmaAttributeCategories.yaml": addId("attributeCategoryID"),
  "dogmaAttributes.yaml": noTransform("attributeID"),
  "dogmaEffects.yaml": noTransform("effectID"),
  "dogmaUnits.yaml": addId("unitID"),
  "dungeons.yaml": addId("dungeonID"),
  "dynamicItemAttributes.yaml": addId("dynamicItemAttributeID"),
  "epicArcs.yaml": addId("epicArcID"),
  "expertSystems.yaml": addId("typeID"),
  "factions.yaml": addId("factionID"),
  "fighterAbilities.yaml": addId("fighterAbilityID"),
  // Records are keyed by `abilitySlot0..2`, so the id stays the map key:
  // injecting it would sit alongside the slot keys.
  "fighterAbilitiesByType.yaml": noTransform("typeID"),
  "freelanceJobSchemas.yaml": addId("freelanceJobSchemaGroupID"),
  // Keyed by the id `skinMaterials.materialSetID` / `graphics.sofMaterialSetID`
  // point at, so it keeps CCP's `materialSetID` name rather than the filename.
  "graphicMaterialSets.yaml": addId("materialSetID"),
  "graphics.yaml": addId("graphicID"),
  "groups.yaml": addId("groupID"),
  "icons.yaml": addId("iconID"),
  "industryActivities.yaml": addId("industryActivityID"),
  "industryAssemblyLines.yaml": addId("industryAssemblyLineID"),
  "industryInstallationTypes.yaml": addId("typeID"),
  // Records are keyed by activity name (`manufacturing`, `invention`, …) —
  // same reason as fighterAbilitiesByType.
  "industryModifierSources.yaml": noTransform("typeID"),
  "industryTargetFilters.yaml": addId("industryTargetFilterID"),
  "landmarks.yaml": addId("landmarkID"),
  "linkWithShip.yaml": addId("typeID"),
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
  "metenoxMoonDrill.yaml": addId("typeID"),
  // The military-campaign files are keyed by UUID, not by an integer id.
  "militaryCampaignObjectives.yaml": addId(
    "militaryCampaignObjectiveID",
    "string",
  ),
  "militaryCampaigns.yaml": addId("militaryCampaignID", "string"),
  "missions.yaml": addId("missionID"),
  "notificationTypes.yaml": addId("notificationTypeID"),
  "npcCharacters.yaml": addId("characterID"),
  "npcCorporationDivisions.yaml": addId("npcCorporationDivisionID"),
  "npcCorporations.yaml": addId("corporationID"),
  "npcStations.yaml": addId("stationID"),
  "planetResources.yaml": addId("planetID"),
  "planetSchematics.yaml": addId("planetSchematicID"),
  "proximityTrap.yaml": addId("typeID"),
  "races.yaml": addId("raceID"),
  "schoolMap.yaml": addId("schoolMapID"),
  "schools.yaml": addId("schoolID"),
  "shipTreeElements.yaml": addId("shipTreeElementID"),
  // Keyed by faction, not by a ship-tree id of its own.
  "shipTreeFactions.yaml": addId("factionID"),
  "shipTreeGroups.yaml": addId("shipTreeGroupID"),
  "skillPlans.yaml": addId("skillPlanID"),
  "skinLicenses.yaml": noTransform("licenseTypeID"),
  "skinMaterials.yaml": noTransform("skinMaterialID"),
  "skinrComponentCategories.yaml": addId("skinrComponentCategoryID"),
  // A bare `rarity -> points` map per component category, so the id stays the
  // map key: injecting it would sit alongside the numeric rarity keys.
  "skinrComponentPointValues.yaml": noTransform("skinrComponentCategoryID"),
  "skinrComponentRarities.yaml": addId("skinrComponentRarityID"),
  "skinrComponents.yaml": addId("skinrComponentID"),
  "skinrSlotCategories.yaml": addId("skinrSlotCategoryID"),
  "skinrSlotConfigurations.yaml": addId("skinrSlotConfigurationID"),
  "skinrSlotNames.yaml": addId("skinrSlotNameID"),
  "skinrSlots.yaml": addId("skinrSlotID"),
  // Each record is a bare ARRAY of {slotID, materialID}; `addId` would set a
  // property on that array, so the faction id stays the map key.
  "skinrSlotsToMaterials.yaml": noTransform("factionID"),
  // A bare `tier -> points` map per ship-tree group — same reason as
  // skinrComponentPointValues.
  "skinrTierThresholds.yaml": noTransform("shipTreeGroupID"),
  "skins.yaml": addId("skinID"),
  "sovereigntyUpgrades.yaml": addId("typeID"),
  "stationOperations.yaml": addId("stationOperationID"),
  "stationServices.yaml": addId("stationServiceID"),
  "stationStandingsRestrictions.yaml": addId("factionID"),
  "systemDbuffEmitters.yaml": addId("typeID"),
  "systemWideEffects.yaml": addId("typeID"),
  "translationLanguages.yaml": noTransform("translationLanguageID", "string"),
  "typeBonus.yaml": addId("typeID"),
  "typeDogma.yaml": addId("typeID"),
  "typeElements.yaml": addId("typeID"),
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
    if (!Object.hasOwn(item, idAttributeName)) {
      throw new Error(`⚠️ Missing ID ${idAttributeName}`);
    }
    const id = item[idAttributeName] as string | number;
    if (Object.hasOwn(map, id)) {
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
  for (const [id, item] of Object.entries(obj)) {
    item[idAttributeName] =
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

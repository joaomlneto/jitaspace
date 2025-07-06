/**
 * Information about the collections to be made available in the OpenAPI spec.
 * A collection is a pair of endpoints:
 * - GET /collection — returns a list of all the IDs available in the collection
 * - GET /collection/{id} — returns a single item from the collection
 * Pagination is not supported, as the collections are expected to be small and static.
 */
import path from "node:path";
import { OpenAPIV3 } from "openapi-types";

import { SDE_PATH } from "../commands/generate";
import { getWorkingDirectory } from "../lib/cli";
import {
  SdeSourceFile,
  fixObjectIndices,
  loadFile,
  sdeInputFiles,
} from "../sources/sde.js";
import { SdeUniverseSource } from "../sources/sde_universe.js";

export type SdeCollection = {
  datasource: (
    | {
        type: "sde";
        name: keyof typeof sdeInputFiles;
      }
    | {
        type: "sde-universe";
        name: SdeUniverseSource;
      }
    | {
        type: "hoboleaks";
        filename: string;
      }
    | {
        type: "custom";
        generator: () => Promise<Record<string, any>>;
      }
  ) & {
    transformations?: ((data: any, file: { idAttributeName: string }) => any)[];
  };
  idAttribute: string;
  model: {
    name: string;
    description?: string;
    patchSchema?: (item: OpenAPIV3.Document) => OpenAPIV3.Document;
  };
  tags: string[];
};

export const collections: Record<string, SdeCollection> = {
  "/inventory/flags": {
    datasource: {
      type: "sde",
      name: "bsd/invFlags.yaml",
    },
    idAttribute: "flagID",
    model: {
      name: "InventoryCategory",
    },
    tags: ["Inventory"],
  },
  "/inventory/items": {
    datasource: {
      type: "sde",
      name: "bsd/invItems.yaml",
    },
    idAttribute: "itemID",
    model: {
      name: "InventoryItem",
    },
    tags: ["Inventory"],
  },
  "/inventory/names": {
    datasource: {
      type: "sde",
      name: "bsd/invNames.yaml",
    },
    idAttribute: "itemID",
    model: {
      name: "InventoryName",
    },
    tags: ["Inventory"],
  },
  "/inventory/positions": {
    datasource: {
      type: "sde",
      name: "bsd/invPositions.yaml",
    },
    idAttribute: "itemID",
    model: {
      name: "InventoryPosition",
    },
    tags: ["Inventory"],
  },
  "/inventory/uniqueNames": {
    datasource: {
      type: "sde",
      name: "bsd/invUniqueNames.yaml",
    },
    idAttribute: "itemID",
    model: {
      name: "InventoryUniqueName",
    },
    tags: ["Inventory"],
  },
  "/universe/stations": {
    datasource: {
      type: "sde",
      name: "bsd/staStations.yaml",
    },
    idAttribute: "stationID",
    model: {
      name: "Station",
    },
    tags: ["Universe"],
  },
  "/characters/agents": {
    datasource: {
      type: "sde",
      name: "fsd/agents.yaml",
    },
    idAttribute: "characterID",
    model: {
      name: "Agent",
    },
    tags: ["Character"],
  },
  "/characters/agentsInSpace": {
    datasource: {
      type: "sde",
      name: "fsd/agentsInSpace.yaml",
    },
    idAttribute: "characterID",
    model: {
      name: "AgentInSpace",
    },
    tags: ["Character"],
  },
  "/universe/ancestries": {
    datasource: {
      type: "sde",
      name: "fsd/ancestries.yaml",
    },
    idAttribute: "ancestryID",
    model: {
      name: "Ancestry",
    },
    tags: ["Universe"],
  },
  "/universe/bloodlines": {
    datasource: {
      type: "sde",
      name: "fsd/bloodlines.yaml",
    },
    idAttribute: "bloodlineID",
    model: {
      name: "Bloodline",
    },
    tags: ["Universe"],
  },
  "/universe/blueprints": {
    datasource: {
      type: "sde",
      name: "fsd/blueprints.yaml",
    },
    idAttribute: "blueprintTypeID",
    model: {
      name: "Blueprint",
    },
    tags: ["Industry"],
  },
  "/universe/categories": {
    datasource: {
      type: "sde",
      name: "fsd/categories.yaml",
    },
    idAttribute: "categoryID",
    model: {
      name: "Category",
    },
    tags: ["Universe"],
  },
  "/universe/certificates": {
    datasource: {
      type: "sde",
      name: "fsd/certificates.yaml",
    },
    idAttribute: "certificateID",
    model: {
      name: "Certificate",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.skillTypes = {
          additionalProperties: {
            type: "object",
            properties: {
              basic: {
                type: "integer",
              },
              standard: {
                type: "integer",
              },
              improved: {
                type: "integer",
              },
              advanced: {
                type: "integer",
              },
              elite: {
                type: "integer",
              },
            },
          },
        };
        return schema;
      },
    },
    tags: ["Universe"],
  },
  "/characters/attributes": {
    datasource: {
      type: "sde",
      name: "fsd/characterAttributes.yaml",
    },
    idAttribute: "attributeID",
    model: {
      name: "CharacterAttribute",
    },
    tags: ["Character"],
  },
  "/universe/contrabandTypes": {
    datasource: {
      type: "sde",
      name: "fsd/contrabandTypes.yaml",
    },
    idAttribute: "typeID",
    model: {
      name: "ContrabandType",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.factions = {
          additionalProperties: {
            type: "object",
            properties: {
              attackMinSec: {
                type: "integer",
              },
              confiscateMinSec: {
                type: "integer",
              },
              fineByValue: {
                type: "integer",
              },
              standingLoss: {
                type: "integer",
              },
            },
          },
        };
        return schema;
      },
    },
    tags: ["Universe"],
  },
  "/universe/controlTowerResources": {
    datasource: {
      type: "sde",
      name: "fsd/controlTowerResources.yaml",
    },
    idAttribute: "typeID",
    model: {
      name: "ControlTowerResource",
    },
    tags: ["Universe"],
  },
  "/corporations/activities": {
    datasource: {
      type: "sde",
      name: "fsd/corporationActivities.yaml",
    },
    idAttribute: "corporationActivityID",
    model: {
      name: "CorporationActivity",
    },
    tags: ["Corporation"],
  },
  "/dogma/attributeCategories": {
    datasource: {
      type: "sde",
      name: "fsd/dogmaAttributeCategories.yaml",
    },
    idAttribute: "attributeCategoryID",
    model: {
      name: "DogmaAttributeCategory",
    },
    tags: ["Dogma"],
  },
  "/dogma/attributes": {
    datasource: {
      type: "sde",
      name: "fsd/dogmaAttributes.yaml",
    },
    idAttribute: "attributeID",
    model: {
      name: "DogmaAttribute",
    },
    tags: ["Dogma"],
  },
  "/dogma/effects": {
    datasource: {
      type: "sde",
      name: "fsd/dogmaEffects.yaml",
    },
    idAttribute: "effectID",
    model: {
      name: "DogmaEffect",
    },
    tags: ["Dogma"],
  },
  "/universe/factions": {
    datasource: {
      type: "sde",
      name: "fsd/factions.yaml",
    },
    idAttribute: "factionID",
    model: {
      name: "Faction",
    },
    tags: ["Universe"],
  },
  "/universe/graphics": {
    datasource: {
      type: "sde",
      name: "fsd/graphicIDs.yaml",
    },
    idAttribute: "graphicID",
    model: {
      name: "Graphic",
    },
    tags: ["Universe"],
  },
  "/universe/groups": {
    datasource: {
      type: "sde",
      name: "fsd/groups.yaml",
    },
    idAttribute: "groupID",
    model: {
      name: "Group",
    },
    tags: ["Universe"],
  },
  "/universe/icons": {
    datasource: {
      type: "sde",
      name: "fsd/iconIDs.yaml",
    },
    idAttribute: "iconID",
    model: {
      name: "Icon",
    },
    tags: ["Universe"],
  },
  "/universe/landmarks": {
    datasource: {
      type: "sde",
      name: "universe/landmarks/landmarks.yaml",
    },
    idAttribute: "landmarkID",
    model: {
      name: "Landmark",
    },
    tags: ["Universe"],
  },
  "/markets/groups": {
    datasource: {
      type: "sde",
      name: "fsd/marketGroups.yaml",
    },
    idAttribute: "marketGroupID",
    model: {
      name: "MarketGroup",
    },
    tags: ["Market"],
  },
  "/universe/metaGroups": {
    datasource: {
      type: "sde",
      name: "fsd/metaGroups.yaml",
    },
    idAttribute: "metaGroupID",
    model: {
      name: "MetaGroup",
    },
    tags: ["Universe"],
  },
  "/corporations/npcCorporationDivisions": {
    datasource: {
      type: "sde",
      name: "fsd/npcCorporationDivisions.yaml",
    },
    idAttribute: "npcCorporationDivisionID",
    model: {
      name: "NPCCorporationDivision",
    },
    tags: ["Corporation"],
  },
  "/corporations/npcCorporations": {
    datasource: {
      type: "sde",
      name: "fsd/npcCorporations.yaml",
    },
    idAttribute: "corporationID",
    model: {
      name: "NPCCorporation",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.corporationTrades = {
          additionalProperties: {
            type: "number",
          },
        };
        // @ts-expect-error
        schema.items.properties.divisions = {
          additionalProperties: {
            type: "object",
            properties: {
              divisionNumber: {
                type: "integer",
              },
              leaderID: {
                type: "integer",
              },
              size: {
                type: "integer",
              },
            },
          },
        };
        // @ts-expect-error
        schema.items.properties.exchangeRates = {
          additionalProperties: {
            type: "number",
          },
        };
        // @ts-expect-error
        schema.items.properties.investors = {
          additionalProperties: {
            type: "number",
          },
        };
        return schema;
      },
    },
    tags: ["Corporation"],
  },
  "/universe/planetSchematics": {
    datasource: {
      type: "sde",
      name: "fsd/planetSchematics.yaml",
    },
    idAttribute: "planetSchematicID",
    model: {
      name: "PlanetSchematic",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.types = {
          additionalProperties: {
            type: "object",
            properties: {
              isInput: {
                type: "boolean",
              },
            },
          },
        };
        return schema;
      },
    },
    tags: ["Planetary Interaction"],
  },
  "/universe/races": {
    datasource: {
      type: "sde",
      name: "fsd/races.yaml",
    },
    idAttribute: "raceID",
    model: {
      name: "Race",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.skills = {
          additionalProperties: {
            type: "integer",
          },
        };
        return schema;
      },
    },
    tags: ["Universe"],
  },
  "/characters/researchAgents": {
    datasource: {
      type: "sde",
      name: "fsd/researchAgents.yaml",
    },
    idAttribute: "characterID",
    model: {
      name: "ResearchAgent",
    },
    tags: ["Character"],
  },
  "/universe/skinLicenses": {
    datasource: {
      type: "sde",
      name: "fsd/skinLicenses.yaml",
    },
    idAttribute: "licenseTypeID",
    model: {
      name: "SkinLicense",
    },
    tags: ["Skins"],
  },
  "/universe/skinMaterials": {
    datasource: {
      type: "sde",
      name: "fsd/skinMaterials.yaml",
    },
    idAttribute: "skinMaterialID",
    model: {
      name: "SkinMaterial",
    },
    tags: ["Skins"],
  },
  "/universe/stationOperations": {
    datasource: {
      type: "sde",
      name: "fsd/stationOperations.yaml",
    },
    idAttribute: "stationOperationID",
    model: {
      name: "StationOperation",
    },
    tags: ["Universe"],
  },
  "/universe/stationServices": {
    datasource: {
      type: "sde",
      name: "fsd/stationServices.yaml",
    },
    idAttribute: "stationServiceID",
    model: {
      name: "StationService",
    },
    tags: ["Universe"],
  },
  "/universe/tournamentRuleSets": {
    datasource: {
      type: "sde",
      name: "fsd/tournamentRuleSets.yaml",
    },
    idAttribute: "ruleSetID",
    model: {
      name: "TournamentRuleSet",
    },
    tags: ["Tournament"],
  },
  "/universe/translationLanguages": {
    datasource: {
      type: "sde",
      name: "fsd/translationLanguages.yaml",
    },
    idAttribute: "translationLanguageID",
    model: {
      name: "TranslationLanguage",
    },
    tags: ["Meta"],
  },
  "/dogma/types": {
    datasource: {
      type: "sde",
      name: "fsd/typeDogma.yaml",
    },
    idAttribute: "typeID",
    model: {
      name: "TypeDogma",
    },
    tags: ["Dogma"],
  },
  "/universe/types": {
    datasource: {
      type: "sde",
      name: "fsd/types.yaml",
    },
    idAttribute: "typeID",
    model: {
      name: "Type",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.traits.properties.types = {
          additionalProperties: {
            type: "object",
            properties: {
              bonus: {
                type: "number",
              },
              bonusText: {
                type: "object",
                properties: {
                  de: {
                    type: "string",
                  },
                  en: {
                    type: "string",
                  },
                  es: {
                    type: "string",
                  },
                  fr: {
                    type: "string",
                  },
                  ja: {
                    type: "string",
                  },
                  ru: {
                    type: "string",
                  },
                },
              },
              importance: {
                type: "integer",
              },
            },
          },
        };
        return schema;
      },
    },
    tags: ["Universe"],
  },
  "/universe/typeMaterials": {
    datasource: {
      type: "sde",
      name: "fsd/typeMaterials.yaml",
    },
    idAttribute: "typeID",
    model: {
      name: "TypeMaterial",
    },
    tags: ["Industry"],
  },
  "/universe/planetResources": {
    datasource: {
      type: "sde",
      name: "fsd/planetResources.yaml",
    },
    idAttribute: "planetID",
    model: {
      name: "PlanetResource",
    },
    tags: ["Universe"],
  },
  "/universe/sovereigntyUpgrades": {
    datasource: {
      type: "sde",
      name: "fsd/sovereigntyUpgrades.yaml",
    },
    idAttribute: "typeID",
    model: {
      name: "SovereigntyUpgrade",
    },
    tags: ["Universe"],
  },
  "/universe/asteroidBelts": {
    datasource: {
      type: "sde-universe",
      name: "asteroidBelts",
    },
    idAttribute: "asteroidBeltID",
    model: {
      name: "AsteroidBelt",
    },
    tags: ["Universe"],
  },
  "/universe/constellations": {
    datasource: {
      type: "sde-universe",
      name: "constellations",
    },
    idAttribute: "constellationID",
    model: {
      name: "Constellation",
    },
    tags: ["Universe"],
  },
  "/universe/moons": {
    datasource: {
      type: "sde-universe",
      name: "moons",
    },
    idAttribute: "moonID",
    model: {
      name: "Moon",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.npcStations = {
          additionalProperties: {
            type: "object",
            properties: {
              graphicID: {
                type: "integer",
              },
              isConquerable: {
                type: "boolean",
              },
              operationID: {
                type: "integer",
              },
              ownerID: {
                type: "integer",
              },
              position: {
                type: "array",
                items: {
                  type: "number",
                },
              },
              reprocessingEfficiency: {
                type: "number",
              },
              reprocessingHangarFlag: {
                type: "number",
              },
              reprocessingStationsTake: {
                type: "number",
              },
              typeID: {
                type: "integer",
              },
              useOperationName: {
                type: "boolean",
              },
            },
          },
        };
        return schema;
      },
    },
    tags: ["Universe"],
  },
  "/universe/planets": {
    datasource: {
      type: "sde-universe",
      name: "planets",
    },
    idAttribute: "planetID",
    model: {
      name: "Planet",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.npcStations = {
          additionalProperties: {
            type: "object",
            properties: {
              graphicID: {
                type: "integer",
              },
              isConquerable: {
                type: "boolean",
              },
              operationID: {
                type: "integer",
              },
              ownerID: {
                type: "integer",
              },
              position: {
                type: "array",
                items: {
                  type: "number",
                },
              },
              reprocessingEfficiency: {
                type: "number",
              },
              reprocessingHangarFlag: {
                type: "number",
              },
              reprocessingStationsTake: {
                type: "number",
              },
              typeID: {
                type: "integer",
              },
            },
          },
        };
        return schema;
      },
    },
    tags: ["Universe"],
  },
  "/universe/regions": {
    datasource: {
      type: "sde-universe",
      name: "regions",
    },
    idAttribute: "regionID",
    model: {
      name: "Region",
    },
    tags: ["Universe"],
  },
  "/universe/solarSystems": {
    datasource: {
      type: "sde-universe",
      name: "solarSystems",
    },
    idAttribute: "solarSystemID",
    model: {
      name: "SolarSystem",
    },
    tags: ["Universe"],
  },
  "/universe/stargates": {
    datasource: {
      type: "sde-universe",
      name: "stargates",
    },
    idAttribute: "stargateID",
    model: {
      name: "Stargate",
    },
    tags: ["Universe"],
  },
  "/universe/stars": {
    datasource: {
      type: "sde-universe",
      name: "stars",
    },
    idAttribute: "starID",
    model: {
      name: "Star",
    },
    tags: ["Universe"],
  },
  "/characters/agentTypes": {
    datasource: {
      type: "hoboleaks",
      filename: "agenttypes.json",
    },
    idAttribute: "agentTypeID",
    model: {
      name: "AgentType",
    },
    tags: ["Character"],
  },
  "/dogma/units": {
    datasource: {
      type: "hoboleaks",
      filename: "dogmaunits.json",
    },
    idAttribute: "unitID",
    model: {
      name: "DogmaUnit",
    },
    tags: ["Dogma"],
  },
  "/wallet/accountingEntryTypes": {
    datasource: {
      type: "hoboleaks",
      filename: "accountingentrytypes.json",
    },
    idAttribute: "accountEntryTypeID",
    model: {
      name: "AccountingEntryType",
    },
    tags: ["Wallet"],
  },
  "/universe/repackagedVolumes": {
    datasource: {
      type: "hoboleaks",
      filename: "repackagedvolumes.json",
    },
    idAttribute: "typeID",
    model: {
      name: "RepackagedVolume",
    },
    tags: ["Universe"],
  },
  "/dogma/dynamicAttributes": {
    datasource: {
      type: "hoboleaks",
      filename: "dynamicitemattributes.json",
    },
    idAttribute: "attributeID",
    model: {
      name: "DynamicAttribute",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.attributeIDs = {
          additionalProperties: {
            type: "object",
            properties: {
              max: {
                type: "number",
              },
              min: {
                type: "number",
              },
              highIsGood: {
                type: "boolean",
              },
            },
          },
        };
        return schema;
      },
    },
    tags: ["Dogma"],
  },
  "/dogma/dbuffs": {
    datasource: {
      type: "hoboleaks",
      filename: "dbuffs.json",
    },
    idAttribute: "dbuffID",
    model: {
      name: "DBuff",
    },
    tags: ["Dogma"],
  },
  "/universe/cloneStates": {
    datasource: {
      type: "hoboleaks",
      filename: "clonestates.json",
    },
    idAttribute: "raceID",
    model: {
      name: "CloneState",
      patchSchema: (schema) => {
        // @ts-expect-error
        schema.items.properties.skills = {
          additionalProperties: {
            type: "integer",
          },
        };
        return schema;
      },
    },
    tags: ["Universe"],
  },
  "/universe/expertSystems": {
    datasource: {
      type: "hoboleaks",
      filename: "expertsystems.json",
    },
    idAttribute: "expertSystemID",
    model: {
      name: "ExpertSystem",
    },
    tags: ["Universe"],
  },
  "/universe/schools": {
    datasource: {
      type: "hoboleaks",
      filename: "schools.json",
    },
    idAttribute: "schoolID",
    model: {
      name: "School",
    },
    tags: ["Universe"],
  },
  "/universe/schoolMap": {
    datasource: {
      type: "hoboleaks",
      filename: "schoolmap.json",
      transformations: [fixObjectIndices],
    },
    idAttribute: "schoolID",
    model: {
      name: "SchoolMap",
    },
    tags: ["Universe"],
  },
  "/characters/skillplans": {
    datasource: {
      type: "hoboleaks",
      filename: "skillplans.json",
    },
    idAttribute: "skillPlanID",
    model: {
      name: "SkillPlan",
    },
    tags: ["Character"],
  },
  "/universe/skins": {
    datasource: {
      type: "hoboleaks",
      filename: "skins.json",
    },
    idAttribute: "skinID",
    model: {
      name: "Skin",
    },
    tags: ["Skins"],
  },
  "/universe/skinMaterialNames": {
    datasource: {
      type: "hoboleaks",
      filename: "skinmaterialnames.json",
    },
    idAttribute: "skinMaterialID",
    model: {
      name: "SkinMaterialName",
    },
    tags: ["Skins"],
  },
  "/universe/graphicMaterialSets": {
    datasource: {
      type: "hoboleaks",
      filename: "graphicmaterialsets.json",
    },
    idAttribute: "graphicMaterialSetID",
    model: {
      name: "GraphicMaterialSet",
    },
    tags: ["Universe"],
  },
  "/industry/activities": {
    datasource: {
      type: "hoboleaks",
      filename: "industryactivities.json",
    },
    idAttribute: "activityID",
    model: {
      name: "IndustryActivity",
    },
    tags: ["Industry"],
  },
  "/industry/assemblyLines": {
    datasource: {
      type: "hoboleaks",
      filename: "industryassemblylines.json",
    },
    idAttribute: "assemblyLineTypeID",
    model: {
      name: "IndustryAssemblyLine",
    },
    tags: ["Industry"],
  },
  "/industry/installationTypes": {
    datasource: {
      type: "hoboleaks",
      filename: "industryinstallationtypes.json",
    },
    idAttribute: "typeID",
    model: {
      name: "IndustryInstallationType",
    },
    tags: ["Industry"],
  },
  "/industry/modifierSources": {
    datasource: {
      type: "hoboleaks",
      filename: "industrymodifiersources.json",
    },
    idAttribute: "typeID",
    model: {
      name: "IndustryModifierSource",
    },
    tags: ["Industry"],
  },
  "/industry/targetFilters": {
    datasource: {
      type: "hoboleaks",
      filename: "industrytargetfilters.json",
    },
    idAttribute: "targetTypeFilterID",
    model: {
      name: "IndustryTargetFilter",
    },
    tags: ["Industry"],
  },
  "/universe/compressibleTypes": {
    datasource: {
      type: "hoboleaks",
      filename: "compressibletypes.json",
    },
    idAttribute: "typeID",
    model: {
      name: "CompressibleType",
    },
    tags: ["Industry"],
  },
  // Helpful index to know the variations of a given type
  "/universe/typeVariations": {
    datasource: {
      type: "sde",
      name: "fsd/types.yaml",
      transformations: [
        (data, { idAttributeName }) => {
          // compute variations for each type
          const variations: Record<number, number[]> = {};
          Object.values(data)
            // @ts-ignore
            .filter((entry) => entry.variationParentTypeID !== undefined)
            .forEach((entry) => {
              // @ts-ignore
              const parentTypeId = entry.variationParentTypeID;
              if (variations[parentTypeId] == undefined)
                variations[parentTypeId] = [parentTypeId];
              // @ts-ignore
              variations[parentTypeId].push(entry.typeID);
            });
          const result: Record<number, { variations: number[] }> = {};
          // populate objects that have a variationParentTypeID
          Object.values(data)
            // @ts-ignore
            .filter((entry) => entry.variationParentTypeID !== undefined)
            .forEach((entry) => {
              // @ts-ignore
              if (entry.variationParentTypeID !== undefined) {
                // @ts-ignore
                result[entry.typeID] = {
                  // @ts-ignore
                  base: entry.variationParentTypeID,
                  // @ts-ignore
                  variations: variations[entry.variationParentTypeID],
                };
              }
            });

          Object.keys(variations).forEach(
            (typeID) =>
              // @ts-ignore
              (result[typeID] = {
                base: Number(typeID),
                // @ts-ignore
                variations: variations[typeID],
              }),
          );
          return result;
        },
      ],
    },
    idAttribute: "typeID",
    model: {
      name: "TypeVariations",
    },
    tags: ["Universe"],
  },
};

/**
 * Record types for the SDE tables the app reads over HTTP from
 * sde.evetech.net, reduced to the fields something here uses. Each table
 * publishes its full JSON Schema at `<table>.schema.json`; extend these from
 * there rather than guessing.
 *
 * Field names are the SDE's own (camelCase, `…ID`), not ESI's: these replace
 * ESI's static `/universe/*` routes, which CCP removed at compatibility date
 * 2026-11-19 in favour of this API.
 */

/** A string in every language the SDE carries. `en` is always present. */
export interface SdeLocalized {
  en: string;
  de?: string;
  es?: string;
  fr?: string;
  ja?: string;
  ko?: string;
  ru?: string;
  zh?: string;
}

export interface SdePosition {
  x: number;
  y: number;
  z: number;
}

export interface SdeType {
  typeID: number;
  groupID: number;
  name: SdeLocalized;
  description?: SdeLocalized;
  basePrice?: number;
  capacity?: number;
  factionID?: number;
  graphicID?: number;
  iconID?: number;
  marketGroupID?: number;
  mass?: number;
  metaGroupID?: number;
  packagedVolume?: number;
  portionSize?: number;
  published?: boolean;
  raceID?: number;
  radius?: number;
  volume?: number;
}

/** A type's dogma. Types with none have no record (the request 404s). */
export interface SdeTypeDogma {
  typeID: number;
  dogmaAttributes?: { attributeID: number; value: number }[];
  dogmaEffects?: { effectID: number; isDefault: boolean }[];
}

export interface SdeGroup {
  groupID: number;
  categoryID: number;
  name: SdeLocalized;
  iconID?: number;
  published?: boolean;
}

export interface SdeCategory {
  categoryID: number;
  name: SdeLocalized;
  iconID?: number;
  published: boolean;
}

export interface SdeRegion {
  regionID: number;
  name: SdeLocalized;
  description?: SdeLocalized;
  constellationIDs: number[];
  factionID?: number;
  position: SdePosition;
  wormholeClassID?: number;
}

export interface SdeConstellation {
  constellationID: number;
  regionID: number;
  name: SdeLocalized;
  solarSystemIDs: number[];
  factionID?: number;
  position: SdePosition;
  wormholeClassID?: number;
}

export interface SdeSolarSystem {
  solarSystemID: number;
  constellationID: number;
  regionID: number;
  name: SdeLocalized;
  planetIDs: number[];
  stargateIDs: number[];
  starID?: number;
  securityStatus: number;
  securityClass?: string;
  position: SdePosition;
  radius: number;
  factionID?: number;
  wormholeClassID?: number;
}

export interface SdeStar {
  starID: number;
  solarSystemID: number;
  typeID: number;
  radius: number;
  statistics?: {
    age?: number;
    life?: number;
    luminosity?: number;
    spectralClass?: string;
    temperature?: number;
  };
}

/**
 * Planets, moons and asteroid belts carry no name unless EVE gives them a
 * unique one; the rest are named from their system (see `celestialNames`).
 */
export interface SdePlanet {
  planetID: number;
  solarSystemID: number;
  typeID: number;
  celestialIndex: number;
  orbitID: number;
  position: SdePosition;
  radius: number;
  moonIDs?: number[];
  asteroidBeltIDs?: number[];
  npcStationIDs?: number[];
  uniqueName?: SdeLocalized;
}

export interface SdeMoon {
  moonID: number;
  solarSystemID: number;
  typeID: number;
  /** The celestial index of the planet it orbits. */
  celestialIndex: number;
  orbitID: number;
  orbitIndex: number;
  position: SdePosition;
  radius: number;
  npcStationIDs?: number[];
  uniqueName?: SdeLocalized;
}

export interface SdeAsteroidBelt {
  asteroidBeltID: number;
  solarSystemID: number;
  typeID: number;
  /** The celestial index of the planet it orbits. */
  celestialIndex: number;
  orbitID: number;
  orbitIndex: number;
  position: SdePosition;
  uniqueName?: SdeLocalized;
}

export interface SdeStargate {
  stargateID: number;
  solarSystemID: number;
  typeID: number;
  position: SdePosition;
  destination: { solarSystemID: number; stargateID: number };
}

/** An NPC station. Its name is not in the SDE; resolve it with `useEsiName`. */
export interface SdeNpcStation {
  stationID: number;
  solarSystemID: number;
  typeID: number;
  ownerID: number;
  operationID: number;
  orbitID: number;
  position: SdePosition;
  reprocessingEfficiency: number;
  reprocessingStationsTake: number;
}

export interface SdeRace {
  raceID: number;
  name: SdeLocalized;
  description?: SdeLocalized;
  iconID?: number;
  /** The race's starter ship, which is also every one of its bloodlines'. */
  shipTypeID?: number;
}

export interface SdeBloodline {
  bloodlineID: number;
  raceID: number;
  corporationID: number;
  name: SdeLocalized;
  description?: SdeLocalized;
  iconID?: number;
  charisma: number;
  intelligence: number;
  memory: number;
  perception: number;
  willpower: number;
}

export interface SdePlanetSchematic {
  schematicID: number;
  name: SdeLocalized;
  /** Seconds per run. */
  cycleTime: number;
  pins: number[];
  types: { typeID: number; isInput: boolean; quantity: number }[];
}

/** Every table read here, by its name in the SDE API. */
export interface SdeRecords {
  types: SdeType;
  typeDogma: SdeTypeDogma;
  groups: SdeGroup;
  categories: SdeCategory;
  mapRegions: SdeRegion;
  mapConstellations: SdeConstellation;
  mapSolarSystems: SdeSolarSystem;
  mapStars: SdeStar;
  mapPlanets: SdePlanet;
  mapMoons: SdeMoon;
  mapAsteroidBelts: SdeAsteroidBelt;
  mapStargates: SdeStargate;
  npcStations: SdeNpcStation;
  races: SdeRace;
  bloodlines: SdeBloodline;
  planetSchematics: SdePlanetSchematic;
}

export type SdeTableName = keyof SdeRecords;

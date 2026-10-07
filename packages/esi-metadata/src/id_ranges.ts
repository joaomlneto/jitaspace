export const npcCharacterIdRanges: [number, number][] = [[3000000, 4000000]];

export const characterIdRanges: [number, number][] = [
  [3000000, 4000000],
  [90000000, 98000000],
  [2100000000, 2147483647],
];

export const npcCorporationIdRanges: [number, number][] = [[1000000, 2000000]];

export const corporationIdRanges: [number, number][] = [
  [1000000, 2000000],
  [98000000, 99000000],
];

export const allianceIdRanges: [number, number][] = [[99000000, 100000000]];

export const regionIdRanges: [number, number][] = [[10000000, 13000000]];
export const constellationIdRanges: [number, number][] = [[20000000, 23000000]];

export const solarSystemRanges: [number, number][] = [[30000000, 33000000]];

export const stargateRanges: [number, number][] = [[50000000, 60000000]];

export const stationRanges: [number, number][] = [[60000000, 70000000]];

export const isIdInRanges = (id: number, ranges: [number, number][]) =>
  ranges.some(([min, max]) => id >= min && id <= max);

/** Whether `id` is an NPC character's (agents included); players are numbered elsewhere. */
export const isNpcCharacterId = (id: number) =>
  isIdInRanges(id, npcCharacterIdRanges);

/** Whether `id` is an NPC corporation's; player corporations are numbered above. */
export const isNpcCorporationId = (id: number) =>
  isIdInRanges(id, npcCorporationIdRanges);

/** Whether `id` is a station's: NPC stations and the stations built from player outposts. Upwell structures are numbered far above. */
export const isStationId = (id: number) => isIdInRanges(id, stationRanges);

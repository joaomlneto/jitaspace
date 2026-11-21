/**
 * There are a number of tables with foreign references that need to be inserted/updated in "unison":
 * - Alliances (has an executor corporation)
 * - Bloodlines (has a corporation ID and a race ID)
 * - Characters (belongs to a corporation, has a bloodline and a race)
 * - Corporations (has a (character) ceo and creator, a faction, a home station, optionally be in an alliance)
 * - Factions (has an associated corporation_id, militia_corporation_id)
 * - Races (has a Faction (though it's named 'alliance_id'))
 * - Stations (owner must be a valid corporation)
 * - Wars (aggressor/defender/ally references to alliances/corporations)
 */
import pLimit from "p-limit";

import {
  getAlliancesAllianceId,
  getCharactersDetail,
  getCorporationsCorporationId,
  getUniverseBloodlines,
  getUniverseFactions,
  getUniverseRaces,
  getUniverseStationsStationId,
  getWarsWarId,
} from "@jitaspace/esi-client";

import type {
  Alliance,
  Bloodline,
  Character,
  Faction,
  Race,
  Station,
  War,
} from "../db";
import type { EsiCorporationRow } from "./mergeEntriesIntoCorporationsTable";
import type {
  SDE_OWNED_BLOODLINE_COLUMNS,
  SDE_OWNED_CHARACTER_COLUMNS,
  SDE_OWNED_FACTION_COLUMNS,
  SDE_OWNED_RACE_COLUMNS,
  SDE_OWNED_STATION_COLUMNS,
} from "./sdeOwnedColumns";
import { CharacterGender, prisma } from "../db";
import { esiTaxRateToFraction } from "./mergeEntriesIntoCorporationsTable";
import {
  esiNameOf,
  eveKillBirthday,
  fetchEveKill,
  NOT_FOUND,
  withEsiRetry,
} from "./refResolution";

// Columns on these ESI-scraped tables that only an SDE ingest writes, so the ESI
// row builders here must not claim to supply them (see sdeOwnedColumns.ts).
type SdeOwnedBloodlineColumn = (typeof SDE_OWNED_BLOODLINE_COLUMNS)[number];
type SdeOwnedCharacterColumn = (typeof SDE_OWNED_CHARACTER_COLUMNS)[number];
type SdeOwnedFactionColumn = (typeof SDE_OWNED_FACTION_COLUMNS)[number];
type SdeOwnedRaceColumn = (typeof SDE_OWNED_RACE_COLUMNS)[number];
type SdeOwnedStationColumn = (typeof SDE_OWNED_STATION_COLUMNS)[number];

const limit = pLimit(1);

/** Where EVE puts deleted characters, and the stand-in for an unknown creator. */
const DOOMHEIM_CORPORATION_ID = 1000001;

interface EveKillCharacter {
  character?: {
    name?: string;
    birthday?: string | null;
    gender?: string | null;
    bloodline_name?: string | null;
    race_name?: string | null;
    description?: string | null;
    security_status?: number | null;
  };
}
interface EveKillCorporation {
  corporation?: {
    name?: string;
    ticker?: string;
    member_count?: number | null;
    tax_rate?: number | null;
    date_founded?: string | null;
    description?: string | null;
  };
}
interface EveKillAlliance {
  alliance?: { name?: string; ticker?: string; date_founded?: string | null };
}

/**
 * Bloodline and race IDs by English name, for eve-kill's name-only fields.
 * Loaded once per process. A failed load is forgotten, so one database error
 * does not fail every later deleted character in the same process.
 */
let bloodlineAndRaceIds:
  | Promise<{ bloodlines: Map<string, number>; races: Map<string, number> }>
  | undefined;
const loadBloodlineAndRaceIds = () =>
  (bloodlineAndRaceIds ??= Promise.all([
    prisma.bloodline.findMany({ select: { bloodlineId: true, name: true } }),
    prisma.race.findMany({ select: { raceId: true, name: true } }),
  ])
    .then(([bloodlines, races]) => ({
      bloodlines: new Map(bloodlines.map((b) => [b.name, b.bloodlineId])),
      races: new Map(races.map((r) => [r.name, r.raceId])),
    }))
    .catch((error: unknown) => {
      bloodlineAndRaceIds = undefined;
      throw error;
    }));

export const createCorpAndItsRefRecords = async ({
  alliances = [],
  bloodlines = [],
  characters = [],
  corporations = [],
  factions = [],
  races = [],
  stations = [],
  wars = [],
  missingAllianceIds = new Set<number>(),
  missingBloodlineIds = new Set<number>(),
  missingCharacterIds = new Set<number>(),
  missingCorporationIds = new Set<number>(),
  missingFactionIds = new Set<number>(),
  missingRaceIds = new Set<number>(),
  missingStationIds = new Set<number>(),
  missingWarIds = new Set<number>(),
}: {
  alliances?: Omit<Alliance, "updatedAt" | "createdAt">[];
  missingAllianceIds?: Set<number>;
  bloodlines?: Omit<
    Bloodline,
    "updatedAt" | "createdAt" | SdeOwnedBloodlineColumn
  >[];
  missingBloodlineIds?: Set<number>;
  characters?: Omit<
    Character,
    "updatedAt" | "createdAt" | SdeOwnedCharacterColumn
  >[];
  missingCharacterIds?: Set<number>;
  corporations?: EsiCorporationRow[];
  missingCorporationIds?: Set<number>;
  factions?: Omit<Faction, "updatedAt" | "createdAt" | SdeOwnedFactionColumn>[];
  missingFactionIds?: Set<number>;
  races?: Omit<Race, "updatedAt" | "createdAt" | SdeOwnedRaceColumn>[];
  missingRaceIds?: Set<number>;
  stations?: Omit<Station, "updatedAt" | "createdAt" | SdeOwnedStationColumn>[];
  missingStationIds?: Set<number>;
  wars?: Omit<War, "updatedAt" | "createdAt">[];
  missingWarIds?: Set<number>;
}) => {
  /**
   * Set of IDs already present in the database, or already fetched
   */
  const existingAllianceIds = new Set<number>(
    alliances.map((alliance) => alliance.allianceId),
  );
  const existingBloodlineIds = new Set<number>(
    bloodlines.map((bloodline) => bloodline.bloodlineId),
  );
  const existingCharacterIds = new Set<number>(
    characters.map((character) => character.characterId),
  );
  const existingCorporationIds = new Set<number>(
    corporations.map((corporation) => corporation.corporationId),
  );
  const existingFactionIds = new Set<number>(
    factions.map((faction) => faction.factionId),
  );
  const existingRaceIds = new Set<number>(races.map((race) => race.raceId));
  const existingStationIds = new Set<number>(
    stations.map((station) => station.stationId),
  );
  const existingWarIds = new Set<number>(wars.map((war) => war.warId));

  const msgs: string[] = [];

  /**
   * Helper functions to determine which IDs are required, and which are missing
   */
  const getRequiredAllianceIds = () => [
    ...new Set(
      [
        ...missingAllianceIds,
        ...corporations.map((corporation) => corporation.allianceId),
        ...wars.flatMap((war) => [
          war.aggressorAllianceId,
          war.defenderAllianceId,
          //...(war.allianceAllies?.map((ally) => ally.allianceId) ?? []),
          //...(war.allies?.map((ally) => ally.allianceId) ?? []),
        ]),
      ]
        .filter((id) => id != null)
        .filter((id) => id != 1),
    ),
  ];

  const getMissingAllianceIds = () =>
    getRequiredAllianceIds().filter((id) => !existingAllianceIds.has(id));

  const getRequiredBloodlineIds = () => [
    ...new Set([
      ...missingBloodlineIds,
      ...characters.map((character) => character.bloodlineId),
    ]),
  ];

  const getMissingBloodlineIds = () =>
    getRequiredBloodlineIds().filter((id) => !existingBloodlineIds.has(id));

  const getRequiredCharacterIds = () => [
    ...new Set(
      [
        ...missingCharacterIds,
        ...corporations.flatMap((corporation) => [
          corporation.ceoId,
          corporation.creatorId,
        ]),
      ]
        .filter((id) => id != null)
        .filter((id) => id != 1),
    ),
  ];

  const getMissingCharacterIds = () =>
    getRequiredCharacterIds().filter((id) => !existingCharacterIds.has(id));

  const getRequiredCorporationIds = () => [
    ...new Set(
      [
        ...missingCorporationIds,
        ...alliances.flatMap((alliance) => [
          alliance.creatorCorporationId,
          alliance.executorCorporationId,
        ]),
        ...bloodlines.map((bloodline) => bloodline.corporationId),
        ...characters.map((character) => character.corporationId),
        ...factions.flatMap((faction) => [
          faction.corporationId,
          faction.militiaCorporationId,
        ]),
        ...stations.map((station) => station.ownerId),
        ...wars.flatMap((war) => [
          war.aggressorCorporationId,
          war.defenderCorporationId,
          //...(war.corporationAllies?.map((ally) => ally.corporationId) ?? []),
          //...(war.allies?.map((ally) => ally.corporationId) ?? []),
        ]),
      ]
        .filter((id) => id != null)
        .filter((id) => id != 1),
    ),
  ];

  const getMissingCorporationIds = () =>
    getRequiredCorporationIds().filter((id) => !existingCorporationIds.has(id));

  const getRequiredFactionIds = () => [
    ...new Set(
      [
        ...missingFactionIds,
        ...characters.map((character) => character.factionId),
        ...corporations.map((corporation) => corporation.enlistedFactionId),
        ...races.map((race) => race.factionId),
      ]
        .filter((id) => id != null)
        .filter((id) => id != 1),
    ),
  ];

  const getMissingFactionIds = () =>
    getRequiredFactionIds().filter((id) => !existingFactionIds.has(id));

  const getRequiredRaceIds = () => [
    ...new Set([
      ...missingRaceIds,
      ...characters.map((character) => character.raceId),
      ...bloodlines.map((bloodline) => bloodline.raceId),
    ]),
  ];

  const getMissingRaceIds = () =>
    getRequiredRaceIds().filter((id) => !existingRaceIds.has(id));

  const getRequiredStationIds = () => [
    ...new Set(
      [
        ...missingStationIds,
        ...corporations.map((corporation) => corporation.homeStationId),
      ]
        .filter((id) => id != null)
        .filter((id) => id != 1),
    ),
  ];

  const getMissingStationIds = () =>
    getRequiredStationIds().filter((id) => !existingStationIds.has(id));

  const getRequiredWarIds = () => [
    ...new Set([...missingWarIds].filter((id) => id != 1)),
  ];

  const getMissingWarIds = () =>
    getRequiredWarIds().filter((id) => !existingWarIds.has(id));

  const filterMissingAllianceIdsInDB = async () => {
    await prisma.alliance
      .findMany({
        select: {
          allianceId: true,
        },
        where: {
          allianceId: {
            in: getMissingAllianceIds(),
          },
        },
      })
      .then((alliances) =>
        alliances.forEach((alliance) =>
          existingAllianceIds.add(alliance.allianceId),
        ),
      );
  };

  const filterMissingBloodlineIdsInDB = async () => {
    await prisma.bloodline
      .findMany({
        select: {
          bloodlineId: true,
        },
        where: {
          bloodlineId: {
            in: getMissingBloodlineIds(),
          },
        },
      })
      .then((bloodlines) =>
        bloodlines.forEach((bloodline) =>
          existingBloodlineIds.add(bloodline.bloodlineId),
        ),
      );
  };

  const filterMissingCharacterIdsInDB = async () => {
    await prisma.character
      .findMany({
        select: {
          characterId: true,
        },
        where: {
          characterId: {
            in: getMissingCharacterIds(),
          },
        },
      })
      .then((characters) =>
        characters.forEach((character) =>
          existingCharacterIds.add(character.characterId),
        ),
      );
  };

  const filterMissingCorporationIdsInDB = async () => {
    await prisma.corporation
      .findMany({
        select: {
          corporationId: true,
        },
        where: {
          corporationId: {
            in: getMissingCorporationIds(),
          },
        },
      })
      .then((corporations) =>
        corporations.forEach((corporation) =>
          existingCorporationIds.add(corporation.corporationId),
        ),
      );
  };

  const filterMissingFactionIdsInDB = async () => {
    await prisma.faction
      .findMany({
        select: {
          factionId: true,
        },
        where: {
          factionId: {
            in: getMissingFactionIds(),
          },
        },
      })
      .then((factions) =>
        factions.forEach((faction) =>
          existingFactionIds.add(faction.factionId),
        ),
      );
  };

  const filterMissingRaceIdsInDB = async () => {
    await prisma.race
      .findMany({
        select: {
          raceId: true,
        },
        where: {
          raceId: {
            in: getMissingRaceIds(),
          },
        },
      })
      .then((races) =>
        races.forEach((race) => existingRaceIds.add(race.raceId)),
      );
  };

  const filterMissingStationIdsInDB = async () => {
    await prisma.station
      .findMany({
        select: {
          stationId: true,
        },
        where: {
          stationId: {
            in: getMissingStationIds(),
          },
        },
      })
      .then((stations) =>
        stations.forEach((station) =>
          existingStationIds.add(station.stationId),
        ),
      );
  };

  const filterMissingWarIdsInDB = async () => {
    await prisma.war
      .findMany({
        select: {
          warId: true,
        },
        where: {
          warId: {
            in: getMissingWarIds(),
          },
        },
      })
      .then((wars) => wars.forEach((war) => existingWarIds.add(war.warId)));
  };

  // check if some of the IDs marked as "missing" are already present in the database
  const filterMissingIdsInDatabase = async () => {
    await filterMissingAllianceIdsInDB();
    await filterMissingBloodlineIdsInDB();
    await filterMissingCharacterIdsInDB();
    await filterMissingCorporationIdsInDB();
    await filterMissingFactionIdsInDB();
    await filterMissingRaceIdsInDB();
    await filterMissingStationIdsInDB();
    await filterMissingWarIdsInDB();
  };

  const fetchMissing = async () => {
    const missingIds = currentStatus().missing;

    // Update alliances
    const fetchedAlliances = await fetchAlliancesFromEsi(
      missingIds.allianceIds,
    );
    alliances.push(...fetchedAlliances);
    fetchedAlliances.forEach((alliance) =>
      existingAllianceIds.add(alliance.allianceId),
    );

    // Update characters
    const fetchedCharacters = await fetchCharactersFromEsi(
      missingIds.characterIds,
    );
    characters.push(...fetchedCharacters);
    fetchedCharacters.forEach((character) =>
      existingCharacterIds.add(character.characterId),
    );

    // Update corporations
    const fetchedCorporations = await fetchCorporationsFromEsi(
      missingIds.corporationIds,
    );
    corporations.push(...fetchedCorporations);
    fetchedCorporations.forEach((corporation) =>
      existingCorporationIds.add(corporation.corporationId),
    );

    // Update stations
    const fetchedStations = await fetchStationsFromEsi(missingIds.stationIds);
    stations.push(...fetchedStations);
    fetchedStations.forEach((station) =>
      existingStationIds.add(station.stationId),
    );

    // Update wars
    const fetchedWars = await fetchWarsFromEsi(missingIds.warIds);
    wars.push(...fetchedWars);
    fetchedWars.forEach((war) => existingWarIds.add(war.warId));

    // Update bloodlines
    if (missingIds.bloodlineIds.length > 0) {
      const fetchedBloodlines = await fetchBloodlinesFromEsi();
      bloodlines.push(...fetchedBloodlines);
      fetchedBloodlines.forEach((bloodline) =>
        existingBloodlineIds.add(bloodline.bloodlineId),
      );
    }

    // Update factions
    if (missingIds.factionIds.length > 0) {
      const fetchedFactions = await fetchFactionsFromEsi();
      factions.push(...fetchedFactions);
      fetchedFactions.forEach((faction) =>
        existingFactionIds.add(faction.factionId),
      );
    }

    // Update races
    if (missingIds.raceIds.length > 0) {
      const fetchedRaces = await fetchRacesFromEsi();
      races.push(...fetchedRaces);
      fetchedRaces.forEach((race) => existingRaceIds.add(race.raceId));
    }
  };

  const currentStatus = () => ({
    existing: {
      allianceIds: [...existingAllianceIds],
      bloodlineIds: [...existingBloodlineIds],
      characterIds: [...existingCharacterIds],
      corporationIds: [...existingCorporationIds],
      factionIds: [...existingFactionIds],
      raceIds: [...existingRaceIds],
      stationIds: [...existingStationIds],
      warIds: [...existingWarIds],
    },
    required: {
      allianceIds: getRequiredAllianceIds(),
      bloodlineIds: getRequiredBloodlineIds(),
      characterIds: getRequiredCharacterIds(),
      corporationIds: getRequiredCorporationIds(),
      factionIds: getRequiredFactionIds(),
      raceIds: getRequiredRaceIds(),
      stationIds: getRequiredStationIds(),
      warIds: getRequiredWarIds(),
    },
    missing: {
      allianceIds: getMissingAllianceIds(),
      bloodlineIds: getMissingBloodlineIds(),
      characterIds: getMissingCharacterIds(),
      corporationIds: getMissingCorporationIds(),
      factionIds: getMissingFactionIds(),
      raceIds: getMissingRaceIds(),
      stationIds: getMissingStationIds(),
      warIds: getMissingWarIds(),
    },
  });

  const allZero = (obj: Record<string, number[]>): boolean => {
    return Object.values(obj).every((x) => x.length == 0);
  };
  const isDone = () => allZero(currentStatus().missing);

  if (!isDone()) {
    console.log("some entries are missing and need to be fetched from ESI...");
    console.log(currentStatus().missing);
  }

  const MAX_ROUNDS = 20;
  await filterMissingIdsInDatabase();
  for (let i = 0; i < MAX_ROUNDS; i++) {
    await fetchMissing();
    await filterMissingIdsInDatabase();
    console.log(`After ${i + 1} rounds`, currentStatus());
    if (isDone()) break;
  }

  if (!isDone()) {
    throw new Error(
      `Some entities still missing after ${MAX_ROUNDS} rounds...`,
    );
  }

  console.log("DONE! Now going to insert into the database...");

  // a bit of cheating… let's create corporation placeholders first...
  // Corporations must go first, with properties removed
  //console.log({ corporations });
  await prisma.corporation.createMany({
    data: corporations.map((corporation) => ({
      ...corporation,
      allianceId: null,
      ceoId: null,
      creatorId: null,
      enlistedFactionId: null,
      homeStationId: null,
    })),
    skipDuplicates: true,
  });

  // Factions must be before Race
  //console.log({ factions });
  await prisma.faction.createMany({ data: factions });
  // Race must be before Bloodline and Character
  //console.log({ races });
  await prisma.race.createMany({ data: races });
  //console.log({ bloodlines });
  await prisma.bloodline.createMany({ data: bloodlines });
  //console.log({ alliances });
  await prisma.alliance.createMany({ data: alliances });
  //console.log({ characters });
  await prisma.character.createMany({ data: characters });
  //console.log({ stations });
  await prisma.station.createMany({ data: stations });
  if (wars.length > 0) {
    const warIds = [
      ...new Set(
        wars
          .map((war) => war.warId)
          .filter((warId): warId is number => typeof warId === "number"),
      ),
    ];
    const existingDbWarIds = new Set<number>(
      await prisma.war
        .findMany({
          select: { warId: true },
          where: {
            warId: {
              in: warIds,
            },
          },
        })
        .then((entries) => entries.map((entry) => entry.warId)),
    );

    for (const war of wars) {
      if (existingDbWarIds.has(war.warId)) continue;

      const {
        allianceAllies: _allianceAllies,
        corporationAllies: _corporationAllies,
        ...warData
      } = war as Omit<War, "updatedAt" | "createdAt"> & {
        allianceAllies?: {
          allianceId?: number | null;
          isDeleted?: boolean;
        }[];
        corporationAllies?: {
          corporationId?: number | null;
          isDeleted?: boolean;
        }[];
      };

      await prisma.war.create({
        data: {
          ...warData,
          /*
          ...(allianceAlliesData.length > 0
            ? { allianceAllies: { create: allianceAlliesData } }
            : {}),
          ...(corporationAlliesData.length > 0
            ? { corporationAllies: { create: corporationAlliesData } }
            : {}),*/
        },
      });
    }
  }

  /*
  console.log("adding missing corp data!!");
  console.log({ corporations });
  console.log(
    corporations.map(
      ({ corporationId, ceoId, creatorId, enlistedFactionId, homeStationId }) => ({
        corporationId,
        ceoId,
        creatorId,
        enlistedFactionId,
        homeStationId,
      }),
    ),
  );*/

  // we can now populate the missing corporation data
  for (const corporation of corporations) {
    //console.log("updating corporation: " + corporation);
    await prisma.corporation.update({
      where: {
        corporationId: corporation.corporationId,
      },
      data: corporation,
    });
  }

  return { status: currentStatus(), msgs };
};

const fetchAlliancesFromEsi = (allianceIds: number[]) =>
  Promise.all(
    allianceIds.map((allianceId) =>
      limit(async () => {
        const res = await withEsiRetry(`alliance ${allianceId}`, () =>
          getAlliancesAllianceId(allianceId),
        );
        if (res !== NOT_FOUND) {
          const alliance = res.data;
          return {
            allianceId,
            creatorCorporationId: alliance.creator_corporation_id,
            dateFounded: new Date(alliance.date_founded),
            executorCorporationId: alliance.executor_corporation_id ?? null,
            factionId: alliance.faction_id ?? null,
            name: alliance.name,
            ticker: alliance.ticker,
            isDeleted: false,
          };
        }
        // EVE no longer shows it. eve-kill keeps name, ticker and founding date,
        // but no source has the creator corporation, so Doomheim marks it unknown.
        const eveKill = (
          await fetchEveKill<EveKillAlliance>(`alliances/${allianceId}`)
        )?.alliance;
        console.log(
          `alliance ${allianceId}: not on ESI; ${eveKill ? "rebuilt from eve-kill" : "storing a marker"}`,
        );
        return {
          allianceId,
          creatorCorporationId: DOOMHEIM_CORPORATION_ID,
          dateFounded: eveKill?.date_founded
            ? new Date(eveKill.date_founded)
            : new Date(0),
          executorCorporationId: null,
          factionId: null,
          name: eveKill?.name ?? (await esiNameOf(allianceId)) ?? "",
          ticker: eveKill?.ticker ?? "",
          isDeleted: true,
        };
      }),
    ),
  );

const fetchBloodlinesFromEsi = () =>
  getUniverseBloodlines()
    .then((res) => res.data)
    .then((bloodlines) =>
      bloodlines.map((bloodline) => ({
        bloodlineId: bloodline.bloodline_id,
        corporationId: bloodline.corporation_id,
        name: bloodline.name,
        description: bloodline.description,
        shipTypeId: bloodline.ship_type_id,
        raceId: bloodline.race_id,
        charisma: bloodline.charisma,
        intelligence: bloodline.intelligence,
        memory: bloodline.memory,
        perception: bloodline.perception,
        willpower: bloodline.willpower,
        isDeleted: false,
      })),
    );

const fetchCharactersFromEsi = (
  characterIds: number[],
): Promise<
  Omit<Character, "updatedAt" | "createdAt" | SdeOwnedCharacterColumn>[]
> =>
  Promise.all(
    characterIds.map((characterId) =>
      limit(async () => {
        const res = await withEsiRetry(`character ${characterId}`, () =>
          getCharactersDetail(characterId),
        );
        if (res !== NOT_FOUND) {
          const character = res.data;
          return {
            characterId,
            birthday: new Date(character.birthday),
            bloodlineId: character.bloodline_id,
            corporationId: character.corporation_id,
            description: character.description ?? null,
            factionId: character.faction_id ?? null,
            gender: character.gender,
            name: character.name,
            raceId: character.race_id,
            securityStatus: character.security_status ?? null,
            title: character.corporation_title ?? null,
            isDeleted: false,
          };
        }
        // Deleted in EVE ("Character has been deleted!"). eve-kill often still has
        // the details; ESI's name lookup still has the name. What neither has is
        // stored as the usual marker values (1970 birthday, bloodline/race 1, male).
        const eveKill = (
          await fetchEveKill<EveKillCharacter>(`characters/${characterId}`)
        )?.character;
        const { bloodlines, races } = await loadBloodlineAndRaceIds();
        const bloodlineId = eveKill?.bloodline_name
          ? bloodlines.get(eveKill.bloodline_name)
          : undefined;
        const raceId = eveKill?.race_name
          ? races.get(eveKill.race_name)
          : undefined;
        const name = eveKill?.name ?? (await esiNameOf(characterId));
        let source = "storing a marker";
        if (eveKill) source = "details from eve-kill";
        else if (name) source = "name from ESI";
        console.log(`character ${characterId}: deleted; ${source}`);
        return {
          characterId,
          birthday: eveKillBirthday(eveKill?.birthday) ?? new Date(1),
          bloodlineId: bloodlineId ?? 1,
          corporationId: DOOMHEIM_CORPORATION_ID,
          description: eveKill?.description ?? null,
          factionId: null,
          gender:
            eveKill?.gender === "female"
              ? CharacterGender.female
              : CharacterGender.male,
          name: name ?? "",
          raceId: raceId ?? 1,
          securityStatus: eveKill?.security_status ?? null,
          title: null,
          isDeleted: true,
        };
      }),
    ),
  );

const fetchCorporationsFromEsi = (
  corporationIds: number[],
): Promise<EsiCorporationRow[]> =>
  Promise.all(
    corporationIds.map((corporationId) =>
      limit(async () => {
        const res = await withEsiRetry(`corporation ${corporationId}`, () =>
          getCorporationsCorporationId(corporationId),
        );
        if (res !== NOT_FOUND) {
          const corporation = res.data;
          return {
            corporationId,
            allianceId: corporation.alliance_id ?? null,
            ceoId:
              corporation.ceo_id != null && corporation.ceo_id > 1
                ? corporation.ceo_id
                : null,
            creatorId:
              corporation.creator_id != null && corporation.creator_id > 1
                ? corporation.creator_id
                : null,
            dateFounded: corporation.date_founded
              ? new Date(corporation.date_founded)
              : null,
            description: corporation.description,
            enlistedFactionId: corporation.enlisted_faction_id ?? null,
            homeStationId: corporation.home_station_id,
            memberCount: corporation.member_count,
            name: corporation.name,
            shares: corporation.shares ? BigInt(corporation.shares) : null,
            taxRate: esiTaxRateToFraction(corporation.tax_rates.isk),
            ticker: corporation.ticker,
            url: corporation.url ?? null,
            warEligible: corporation.war_eligible,
            isDeleted: false,
          };
        }
        // EVE no longer shows it. eve-kill may still have it; otherwise a marker
        // (blank name, memberCount -1). References are left empty rather than
        // pointing at entities that may not exist either.
        const eveKill = (
          await fetchEveKill<EveKillCorporation>(
            `corporations/${corporationId}`,
          )
        )?.corporation;
        console.log(
          `corporation ${corporationId}: not on ESI; ${eveKill ? "rebuilt from eve-kill" : "storing a marker"}`,
        );
        return {
          corporationId,
          allianceId: null,
          ceoId: null,
          creatorId: null,
          dateFounded: eveKill?.date_founded
            ? new Date(eveKill.date_founded)
            : null,
          description: eveKill?.description ?? null,
          enlistedFactionId: null,
          homeStationId: null,
          memberCount: eveKill?.member_count ?? -1,
          name: eveKill?.name ?? (await esiNameOf(corporationId)) ?? "",
          shares: null,
          taxRate: eveKill?.tax_rate ?? 0,
          ticker: eveKill?.ticker ?? "",
          url: null,
          warEligible: null,
          isDeleted: true,
        };
      }),
    ),
  );

const fetchFactionsFromEsi = () =>
  getUniverseFactions()
    .then((res) => res.data)
    .then((factions) =>
      factions.map((faction) => ({
        factionId: faction.faction_id,
        corporationId: faction.corporation_id ?? null,
        description: faction.description,
        isUnique: faction.is_unique,
        militiaCorporationId: faction.militia_corporation_id ?? null,
        name: faction.name,
        sizeFactor: faction.size_factor,
        solarSystemId: faction.solar_system_id ?? null,
        stationCount: faction.station_count,
        stationSystemCount: faction.station_system_count,
        // SDE-only; ingestSdeFactions fills these in.
        flatLogo: null,
        flatLogoWithName: null,
        isDeleted: false,
      })),
    );

const fetchRacesFromEsi = () =>
  getUniverseRaces()
    .then((res) => res.data)
    .then((races) =>
      races.map((race) => ({
        raceId: race.race_id,
        name: race.name,
        description: race.description,
        factionId: race.alliance_id,
        // SDE-only; ingestSdeRaces fills this in.
        shipTypeId: null,
        isDeleted: false,
      })),
    );

const fetchStationsFromEsi = (stationIds: number[]) =>
  Promise.all(
    stationIds.map((stationId) =>
      limit(async () => {
        const res = await withEsiRetry(`station ${stationId}`, () =>
          getUniverseStationsStationId(stationId),
        );
        if (res === NOT_FOUND) {
          // Not on ESI and no other source lists stations: store a marker.
          console.log(`station ${stationId}: not on ESI; storing a marker`);
          return {
            stationId,
            name: "",
            solarSystemId: null,
            typeId: 54, // just a placeholder should be a valid type ID...
            maxDockableShipVolume: -1,
            officeRentalCost: -1,
            ownerId: null,
            raceId: null,
            reprocessingEfficiency: -1,
            reprocessingStationsTake: -1,
            reprocessingHangarFlag: null,
            isDeleted: true,
          };
        }
        const station = res.data;
        return {
          stationId: station.station_id,
          name: station.name,
          solarSystemId: station.system_id === 1 ? null : station.system_id,
          typeId: station.type_id,
          maxDockableShipVolume: station.max_dockable_ship_volume,
          officeRentalCost: station.office_rental_cost,
          ownerId: station.owner ?? null,
          raceId: station.race_id ?? null,
          reprocessingEfficiency: station.reprocessing_efficiency,
          reprocessingStationsTake: station.reprocessing_stations_take,
          // SDE-only; ingestSdeStations fills this in.
          reprocessingHangarFlag: null,
          isDeleted: false,
        };
      }),
    ),
  );

const fetchWarsFromEsi = (warIds: number[]) =>
  Promise.all(
    warIds.map((warId) =>
      limit(async () =>
        withEsiRetry(`war ${warId}`, () => getWarsWarId(warId))
          .then((res) => {
            if (res === NOT_FOUND)
              throw new Error(`war ${warId} is not on ESI`);
            return res.data;
          })
          .then((war) => ({
            warId: warId,
            declaredDate: new Date(war.declared),
            finishedDate: war.finished ? new Date(war.finished) : null,
            retractedDate: war.retracted ? new Date(war.retracted) : null,
            startedDate: war.started ? new Date(war.started) : null,
            isMutual: war.mutual,
            isOpenForAllies: war.open_for_allies,
            aggressorAllianceId: war.aggressor.alliance_id ?? null,
            aggressorCorporationId: war.aggressor.corporation_id ?? null,
            aggressorIskDestroyed: war.aggressor.isk_destroyed,
            aggressorShipsKilled: war.aggressor.ships_killed,
            defenderAllianceId: war.defender.alliance_id ?? null,
            defenderCorporationId: war.defender.corporation_id ?? null,
            defenderIskDestroyed: war.defender.isk_destroyed,
            defenderShipsKilled: war.defender.ships_killed,
            /*
            allianceAllies:
              war.allies
                ?.filter((ally) => ally.alliance_id)
                .map((ally) => ally.alliance_id!)
                .map((allyAllianceId) => ({
                  warId,
                  allianceId: allyAllianceId,
                  isDeleted: false,
                })) ?? [],
            corporationAllies:
              war.allies
                ?.filter((ally) => ally.corporation_id)
                .map((ally) => ally.corporation_id!)
                .map((allyCorporationId) => ({
                  warId,
                  corporationId: allyCorporationId,
                  isDeleted: false,
                })) ?? [],*/
            isDeleted: false,
          })),
      ),
    ),
  );

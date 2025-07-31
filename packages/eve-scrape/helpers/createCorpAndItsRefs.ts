/**
 * There are a number of tables with foreign references that need to be inserted/updated in "unison":
 * - Alliances (has an executor corporation)
 * - Bloodlines (has a corporation ID and a race ID)
 * - Characters (belongs to a corporation, has a bloodline and a race)
 * - Corporations (has a (character) ceo and creator, a faction, a home station, optionally be in an alliance)
 * - Factions (has an associated corporation_id, militia_corporation_id)
 * - Races (has a Faction (though it's named 'alliance_id'))
 * - Stations (owner must be a valid corporation)
 */
import pLimit from "p-limit";

import {
  Alliance,
  Bloodline,
  Character,
  CharacterGender,
  Corporation,
  Faction,
  prisma,
  Race,
  Station,
} from "@jitaspace/db";
import {
  getAlliancesAllianceId,
  getCharactersCharacterId,
  getCorporationsCorporationId,
  getUniverseBloodlines,
  getUniverseFactions,
  getUniverseRaces,
  getUniverseStationsStationId,
} from "@jitaspace/esi-client";

const limit = pLimit(3);

export const createCorpAndItsRefRecords = async ({
  alliances = [],
  bloodlines = [],
  characters = [],
  corporations = [],
  factions = [],
  races = [],
  stations = [],
  missingAllianceIds = new Set<number>(),
  missingBloodlineIds = new Set<number>(),
  missingCharacterIds = new Set<number>(),
  missingCorporationIds = new Set<number>(),
  missingFactionIds = new Set<number>(),
  missingRaceIds = new Set<number>(),
  missingStationIds = new Set<number>(),
}: {
  alliances?: Omit<Alliance, "updatedAt">[];
  missingAllianceIds?: Set<number>;
  bloodlines?: Omit<Bloodline, "updatedAt">[];
  missingBloodlineIds?: Set<number>;
  characters?: Omit<Character, "updatedAt">[];
  missingCharacterIds?: Set<number>;
  corporations?: Omit<Corporation, "updatedAt">[];
  missingCorporationIds?: Set<number>;
  factions?: Omit<Faction, "updatedAt">[];
  missingFactionIds?: Set<number>;
  races?: Omit<Race, "updatedAt">[];
  missingRaceIds?: Set<number>;
  stations?: Omit<Station, "updatedAt">[];
  missingStationIds?: Set<number>;
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

  const msgs: string[] = [];

  /**
   * Helper functions to determine which IDs are required, and which are missing
   */
  const getRequiredAllianceIds = () => [
    ...new Set(
      [
        ...missingAllianceIds,
        ...corporations.map((corporation) => corporation.allianceId),
      ]
        .filter((id) => id != null)
        .filter((id) => id != 1),
    ),
  ];

  const getMissingAllianceIds = () =>
    getRequiredAllianceIds().filter((id) => !existingAllianceIds.has(id));

  const getRequiredBloodlineIds = () => [
    ...new Set(
      [
        ...missingBloodlineIds,
        ...characters.map((character) => character.bloodlineId),
      ].filter((id) => id != null),
    ),
  ];

  const getMissingBloodlineIds = () =>
    getRequiredBloodlineIds().filter((id) => !existingBloodlineIds.has(id));

  const getRequiredCharacterIds = () => [
    ...new Set(
      [
        ...missingCharacterIds,
        ...corporations
          .map((corporation) => [corporation.ceoId, corporation.creatorId])
          .flat(),
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
        ...alliances
          .map((alliance) => [
            alliance.creatorCorporationId,
            alliance.executorCorporationId,
          ])
          .flat(),
        ...bloodlines.map((bloodline) => bloodline.corporationId),
        ...characters.map((character) => character.corporationId),
        ...factions
          .map((faction) => [
            faction.corporationId,
            faction.militiaCorporationId,
          ])
          .flat(),
        ...stations.map((station) => station.ownerId),
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
        ...corporations.map((corporation) => corporation.factionId),
        ...races.map((race) => race.factionId),
      ]
        .filter((id) => id != null)
        .filter((id) => id != 1),
    ),
  ];

  const getMissingFactionIds = () =>
    getRequiredFactionIds().filter((id) => !existingFactionIds.has(id));

  const getRequiredRaceIds = () => [
    ...new Set(
      [
        ...missingRaceIds,
        ...characters.map((character) => character.raceId),
        ...bloodlines.map((bloodline) => bloodline.raceId),
      ].filter((id) => id != null),
    ),
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

  // check if some of the IDs marked as "missing" are already present in the database
  const filterMissingIdsInDatabase = async () => {
    await filterMissingAllianceIdsInDB();
    await filterMissingBloodlineIdsInDB();
    await filterMissingCharacterIdsInDB();
    await filterMissingCorporationIdsInDB();
    await filterMissingFactionIdsInDB();
    await filterMissingRaceIdsInDB();
    await filterMissingStationIdsInDB();
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
    },
    required: {
      allianceIds: getRequiredAllianceIds(),
      bloodlineIds: getRequiredBloodlineIds(),
      characterIds: getRequiredCharacterIds(),
      corporationIds: getRequiredCorporationIds(),
      factionIds: getRequiredFactionIds(),
      raceIds: getRequiredRaceIds(),
      stationIds: getRequiredStationIds(),
    },
    missing: {
      allianceIds: getMissingAllianceIds(),
      bloodlineIds: getMissingBloodlineIds(),
      characterIds: getMissingCharacterIds(),
      corporationIds: getMissingCorporationIds(),
      factionIds: getMissingFactionIds(),
      raceIds: getMissingRaceIds(),
      stationIds: getMissingStationIds(),
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
  console.log({ corporations });
  await prisma.corporation.createMany({
    data: corporations.map((corporation) => ({
      ...corporation,
      allianceId: null,
      ceoId: null,
      creatorId: null,
      factionId: null,
      homeStationId: null,
    })),
    skipDuplicates: true,
  });

  // Factions must be before Race
  console.log({ factions });
  await prisma.faction.createMany({ data: factions });
  // Race must be before Bloodline and Character
  console.log({ races });
  await prisma.race.createMany({ data: races });
  console.log({ bloodlines });
  await prisma.bloodline.createMany({ data: bloodlines });
  console.log({ alliances });
  console.log({ previouslyAddedCorps: corporations });
  await prisma.alliance.createMany({ data: alliances });
  console.log({ characters });
  await prisma.character.createMany({ data: characters });
  console.log({ stations });
  await prisma.station.createMany({ data: stations });

  console.log("adding missing corp data!!");
  console.log({ corporations });
  console.log(
    corporations.map(
      ({ corporationId, ceoId, creatorId, factionId, homeStationId }) => ({
        corporationId,
        ceoId,
        creatorId,
        factionId,
        homeStationId,
      }),
    ),
  );

  // we can now populate the missing corporation data
  for (const corporation of corporations) {
    console.log("updating corporation: " + corporation);
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
      limit(async () =>
        getAlliancesAllianceId(allianceId)
          .then((res) => res.data)
          .then((alliance) => ({
            allianceId,
            creatorCorporationId: alliance.creator_corporation_id,
            dateFounded: new Date(alliance.date_founded),
            executorCorporationId: alliance.executor_corporation_id ?? null,
            factionId: alliance.faction_id ?? null,
            name: alliance.name,
            ticker: alliance.ticker,
            isDeleted: false,
          })),
      ),
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
): Promise<Omit<Character, "updatedAt">[]> =>
  Promise.all(
    characterIds.map((characterId) =>
      limit(async () =>
        getCharactersCharacterId(characterId)
          .then((res) => res.data)
          .then((character) => ({
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
            title: character.title ?? null,
            isDeleted: false,
          }))
          .catch((err) => {
            console.log("error fetching character with ID " + characterId, err);
            return {
              characterId,
              birthday: new Date(1),
              bloodlineId: 1,
              corporationId: 1000001,
              description: null,
              factionId: null,
              gender: CharacterGender.male,
              name: "",
              raceId: 1,
              securityStatus: null,
              title: null,
              isDeleted: true,
            };
          }),
      ),
    ),
  );

const fetchCorporationsFromEsi = (
  corporationIds: number[],
): Promise<Omit<Corporation, "updatedAt">[]> =>
  Promise.all(
    corporationIds.map((corporationId) =>
      limit(async () =>
        getCorporationsCorporationId(corporationId)
          .then((res) => res.data)
          .then((corporation) => ({
            corporationId,
            allianceId: corporation.alliance_id ?? null,
            ceoId: corporation.ceo_id > 1 ? corporation.ceo_id : null,
            creatorId:
              corporation.creator_id > 1 ? corporation.creator_id : null,
            dateFounded: corporation.date_founded
              ? new Date(corporation.date_founded)
              : null,
            description: corporation.description ?? null,
            factionId: corporation.faction_id ?? null,
            homeStationId: corporation.home_station_id ?? null,
            memberCount: corporation.member_count,
            name: corporation.name,
            shares: corporation.shares ? BigInt(corporation.shares) : null,
            taxRate: corporation.tax_rate ?? null,
            ticker: corporation.ticker,
            url: corporation.url ?? null,
            warEligible: corporation.war_eligible ?? null,
            isDeleted: false,
          }))
          .catch((err) => {
            console.log(
              "error fetching corporation with ID " + corporationId,
              err,
            );
            return {
              corporationId,
              allianceId: null,
              ceoId: null,
              creatorId: null,
              dateFounded: null,
              description: null,
              factionId: null,
              homeStationId: null,
              memberCount: -1,
              name: "",
              shares: null,
              taxRate: 0,
              ticker: "",
              url: null,
              warEligible: null,
              isDeleted: false,
            };
          }),
      ),
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
        isDeleted: false,
      })),
    );

const fetchStationsFromEsi = (stationIds: number[]) =>
  Promise.all(
    stationIds.map((stationId) =>
      limit(async () =>
        getUniverseStationsStationId(stationId)
          .then((res) => res.data)
          .then((station) => ({
            stationId: station.station_id,
            name: station.name,
            solarSystemId: station.system_id !== 1 ? station.system_id : null,
            typeId: station.type_id,
            maxDockableShipVolume: station.max_dockable_ship_volume,
            officeRentalCost: station.office_rental_cost,
            ownerId: station.owner ?? null,
            raceId: station.race_id ?? null,
            reprocessingEfficiency: station.reprocessing_efficiency,
            reprocessingStationsTake: station.reprocessing_stations_take,
            isDeleted: false,
          }))
          .catch((err) => {
            console.log("error fetching station with ID " + stationId, err);
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
              isDeleted: true,
            };
          }),
      ),
    ),
  );

/**
 * Card data recorded from ESI on 2026-10-13 (see the ids), so the stories show
 * real entities without calling ESI. Re-recording would show the same shapes.
 *
 * The alliance lists a sample of its member corporations and gives their full
 * count separately, as the card expects of large alliances. Descriptions are
 * written for the stories: player-written text is not copied here.
 */
import type {
  AllianceCardData,
  CharacterCardData,
  CorporationCardData,
  KillmailCardData,
  TypeCardData,
  WarCardData,
} from "@jitaspace/ui";

export const ALLIANCE = {
  id: 1354830081,
  data: {
    name: "Goonswarm Federation",
    ticker: "CONDI",
    dateFounded: new Date("2010-06-01T05:36:00Z"),
    executorCorporation: {
      id: 1344654522,
      name: "DJ's Retirement Fund",
    },
    creatorCorporation: {
      id: 459299583,
      name: "Effervescent Blue",
    },
    creator: {
      id: 240070320,
      name: "La Sinistra",
    },
    memberCorporations: [
      {
        id: 98643032,
        name: "0ld Town",
      },
      {
        id: 1825947362,
        name: "A.A.A",
      },
      {
        id: 98487909,
        name: "Aerotyne International",
      },
      {
        id: 98107684,
        name: "All Hallows Eve.",
      },
      {
        id: 98812894,
        name: "Amazh Industries",
      },
      {
        id: 98721350,
        name: "Angry Midlife Aliens",
      },
      {
        id: 505831061,
        name: "AOB Industries",
      },
      {
        id: 98760940,
        name: "Associates of the Hand",
      },
      {
        id: 98735115,
        name: "Azo's Maple Syrup Collective",
      },
      {
        id: 98743650,
        name: "Baschti's Uncreatively Named Altcorp",
      },
      {
        id: 98711671,
        name: "Bell Exploration",
      },
      {
        id: 98799069,
        name: "Big Squeeze Compression Services",
      },
      {
        id: 98693431,
        name: "Blazing Hive Enterprises",
      },
      {
        id: 98283609,
        name: "Bompkins and Jet Enterprises",
      },
      {
        id: 98837582,
        name: "Busy Bee Bakery and PI Shop",
      },
      {
        id: 98436761,
        name: "Capital GenCorp",
      },
      {
        id: 98593092,
        name: "Casual Resolute Elegant Wise and Witty",
      },
      {
        id: 98812325,
        name: "Children Reading In Space Poorly",
      },
      {
        id: 98818034,
        name: "Cloaked Builders Society",
      },
      {
        id: 98842602,
        name: "Cold Iron Foundry",
      },
      {
        id: 98268722,
        name: "Cool Kids Inc",
      },
      {
        id: 98807343,
        name: "Covert Operations Division",
      },
      {
        id: 98512578,
        name: "CryoTech Industries",
      },
      {
        id: 98803260,
        name: "Czech Goonswarm Mining Legion",
      },
      {
        id: 98648361,
        name: "Deadspace Excavations",
      },
      {
        id: 98841702,
        name: "Delta G Industries",
      },
      {
        id: 98842461,
        name: "Devil Inside",
      },
      {
        id: 98831743,
        name: "DLCM Industry Corp.",
      },
      {
        id: 98303750,
        name: "Dreidel Droppers",
      },
      {
        id: 98724468,
        name: "Dynex's PI Industry",
      },
    ],
    memberCorporationCount: 807,
  } satisfies AllianceCardData,
};

export const CORPORATION = {
  id: 1018389948,
  data: {
    name: "Dreddit",
    ticker: "B0RT",
    alliance: {
      id: 498125261,
      name: "Test Alliance Please Ignore",
    },
    ceo: {
      id: 94372731,
      name: "Baldur Kilgannon",
    },
    creator: {
      id: 944480411,
      name: "Fletcher Hammond",
    },
    memberCount: 2301,
    taxRate: 10.1,
    shares: 1000,
    dateFounded: new Date("2010-02-10T00:19:00Z"),
    warEligible: true,
    url: "http://dredditisrecruiting.com",
    palette: {
      main_color: "#0029ff",
      secondary_color: "#009cff",
      tertiary_color: "#ffffff",
    },
    description:
      "A corporation's own description appears here, as plain text and clamped to four lines, followed by its homepage when it has a valid one.",
  } satisfies CorporationCardData,
};

export const CHARACTER = {
  id: 196379789,
  data: {
    name: "Chribba",
    corporation: {
      id: 1164409536,
      name: "Otherworld Enterprises",
    },
    alliance: {
      id: 159826257,
      name: "Otherworld Empire",
    },
    birthday: new Date("2003-06-10T17:47:00Z"),
    securityStatus: 5.1,
  } satisfies CharacterCardData,
};

export const WAR = {
  id: 739773,
  data: {
    aggressor: {
      kind: "alliance",
      entity: {
        id: 131511956,
        name: "Tactical Narcotics Team",
      },
      iskDestroyed: 5100346700,
      shipsKilled: 74,
    },
    defender: {
      kind: "alliance",
      entity: {
        id: 99009280,
        name: "Tranquility Trading Consortium",
      },
      iskDestroyed: 8204592192,
      shipsKilled: 125,
    },
    declared: new Date("2024-03-20T20:09:00Z"),
    started: new Date("2024-03-21T20:09:00Z"),
    finished: new Date("2024-03-28T20:25:00Z"),
    mutual: false,
    openForAllies: true,
  } satisfies WarCardData,
};

export const TYPE = {
  id: 587,
  data: {
    name: "Rifter",
    group: {
      id: 25,
      name: "Frigate",
    },
    category: {
      id: 6,
      name: "Ship",
    },
    volume: 2500,
    mass: 1067000,
    capacity: 140,
    price: 284513.53,
    description:
      "An item's description appears here, clamped to four lines. The EVE markup in the original is stripped before it reaches the card.",
  } satisfies TypeCardData,
};

export const KILLMAIL = {
  id: 116421364,
  data: {
    time: new Date("2024-03-21T20:32:49Z"),
    victim: {
      character: {
        id: 1239356440,
        name: "daarkfyre",
      },
      corporation: {
        id: 98012419,
        name: "I N E X T R E M I S",
      },
      alliance: {
        id: 131511956,
        name: "Tactical Narcotics Team",
      },
      ship: {
        id: 11393,
        name: "Retribution",
      },
      damageTaken: 5759,
    },
    finalBlow: {
      character: {
        id: 2121551136,
        name: "Anonymous Comet",
      },
      corporation: {
        id: 98750570,
        name: "Jade Cloud Corporation",
      },
      alliance: {
        id: 99003581,
        name: "Fraternity.",
      },
      ship: {
        id: 12023,
        name: "Deimos",
      },
    },
    attackerCount: 30,
    solarSystem: {
      id: 30000872,
      name: "Q-CAB2",
      securityStatus: -0.776,
    },
  } satisfies KillmailCardData,
};

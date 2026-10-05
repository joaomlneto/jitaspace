import type {
  CorporationPageData,
  CorporationProfile,
  CorporationTables,
} from "./types";

/**
 * Splits a corporation's profile into what the page carries and the table
 * rows `/api/corporation/[corporationId]` serves when a tab needs them.
 */
export function splitCorporationProfile(profile: CorporationProfile): {
  page: CorporationPageData;
  tables: CorporationTables;
} {
  const {
    stations,
    agents,
    agentTypes,
    agentDivisions,
    trades,
    wars,
    ...rest
  } = profile;
  return {
    page: {
      ...rest,
      counts: {
        stations: stations.length,
        agents: agents.length,
        trades: trades.length,
        listedWars: wars.length,
      },
    },
    tables: { stations, agents, agentTypes, agentDivisions, trades, wars },
  };
}
